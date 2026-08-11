import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional


def _read_env():
    # Only support GROQ as the remote LLM provider in this deployment.
    groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("GSK_API_KEY")
    if groq_key:
        return {
            "api_key": groq_key,
            "api_url": os.environ.get("GROQ_API_URL") or "https://api.groq.com",
            "provider": "groq"
        }
    # No remote LLM configured
    return {"api_key": None, "api_url": None, "provider": None}


def call_chat_completion(system: str, user_messages: str, max_tokens: int = 512) -> Optional[str]:
    cfg = _read_env()
    key = cfg["api_key"]
    url = cfg["api_url"]
    provider = cfg.get("provider")

    # Only GROQ supported in this deployment. If not configured, return None to trigger heuristic fallback.
    if provider != "groq" or not key:
        return None

    try:
        # Groq uses OpenAI-compatible API
        api_endpoint = f"{url}/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",  # Updated to current Groq model
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_messages}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3  # Lower temperature for more focused answers
        }
        
        req = urllib.request.Request(
            api_endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            
            # Extract response from Groq's OpenAI-compatible format
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"]
                return content
            
            return body
            
    except urllib.error.HTTPError as he:
        try:
            body = he.read().decode("utf-8")
            error_data = json.loads(body) if body else {}
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            error_code = error_data.get("error", {}).get("code", "unknown")
            print(f"[LLM CLIENT] GROQ HTTP {he.code}: {error_msg} (code: {error_code})")
            
            # If it's a rate limit or auth error, provide helpful message
            if he.code == 403:
                print("[LLM CLIENT] ⚠️  Groq API authentication failed (403).")
                print("[LLM CLIENT] Error code:", error_code)
                print("[LLM CLIENT] This usually means:")
                print("[LLM CLIENT]   1. Invalid API key format")
                print("[LLM CLIENT]   2. API key has been revoked")
                print("[LLM CLIENT]   3. Account suspended or requires billing setup")
                print("[LLM CLIENT]   4. IP/region restrictions")
                print("[LLM CLIENT] 💡 Get a new API key from: https://console.groq.com/keys")
                print("[LLM CLIENT] Using fallback heuristic extraction instead.")
            elif he.code == 429:
                print("[LLM CLIENT] Groq rate limit exceeded. Using fallback.")
        except Exception:
            print(f"[LLM CLIENT] GROQ HTTP error: {he}")
        return None
    except Exception as e:
        print(f"[LLM CLIENT] GROQ call failed: {e}")
        return None


def synthesize_structured(snippets: str) -> Dict[str, Any]:
    """Ask the remote LLM to produce structured fields: cause, prevention, remedy_natural, remedy_chemical, short_answer.
    Returns a dict with keys and empty strings when LLM not configured.
    """
    system = (
        "You are an expert agronomist. Given the provided source snippets about a tomato disease, "
        "extract concise structured information in JSON with keys: cause, prevention, remedy_natural, remedy_chemical, short_answer. "
        "Do NOT invent pesticide doses or recommend forbidden chemicals. If snippets mention doses, set "
        "a field 'requires_human_review' to true and move any chemical names into 'chemicals_mentioned' array. "
        "Output ONLY valid JSON parsable by a JSON parser."
    )

    user_messages = (
        "Here are the top retrieved snippets:\n\n" + snippets + "\n\n"
        "Produce a JSON object with keys: cause, prevention, remedy_natural, remedy_chemical, short_answer (one paragraph), "
        "requires_human_review (true/false), chemicals_mentioned (array). Keep answers concise. "
        "If you cannot determine natural vs chemical remedies, put suggestions under the appropriate key and leave the other empty. "
        "Do NOT invent pesticide doses — if doses appear in sources set requires_human_review=true and include chemicals_mentioned. Output ONLY valid JSON."
    )

    out = call_chat_completion(system, user_messages, max_tokens=512)
    if not out:
        # fallback to a simple local heuristic summarizer
        return _heuristic_summarize(snippets)

    # Try to parse JSON from the LLM response
    try:
        s = out.strip()
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1:
            raw = s[start:end+1]
            return json.loads(raw)
        return json.loads(s)
    except Exception:
        return {"cause": "", "prevention": "", "remedy": "", "remedy_natural": "", "remedy_chemical": "", "short_answer": out, "requires_human_review": False, "chemicals_mentioned": []}


def _heuristic_summarize(snippets: str) -> Dict[str, Any]:
    """Very simple extractor: look for sentences containing keywords and return short aggregated answers."""
    import re
    s = snippets or ""
    sentences = re.split(r"(?<=[\.\?\!])\s+", s)

    def find_lines(keywords):
        found = []
        for sent in sentences:
            low = sent.lower()
            for k in keywords:
                if k in low:
                    found.append(sent.strip())
                    break
        return found

    cause_kw = ["symptom", "cause", "caused by", "causal", "agent", "etiology"]
    prevention_kw = ["prevent", "prevention", "avoid", "sanit", "remove", "rotation", "drip", "mulch", "spacing"]
    remedy_kw = ["treat", "manage", "control", "apply", "use", "fungicid", "spray", "biocontrol"]

    cause = " ".join(find_lines(cause_kw))
    prevention = " ".join(find_lines(prevention_kw))
    remedy = " ".join(find_lines(remedy_kw))

    # Heuristic split: natural vs chemical
    natural_kw = ["organic", "neem", "compost", "biocontrol", "mulch", "crop rotation", "cultural", "remove", "sanitize", "prune"]
    chemical_kw = ["fungicide", "pesticide", "spray", "chlorothalonil", "mancozeb", "copper", "difenoconazole", "azoxystrobin"]
    remedy_natural_parts = []
    remedy_chemical_parts = []
    for sent in find_lines(remedy_kw):
        low = sent.lower()
        if any(k in low for k in natural_kw):
            remedy_natural_parts.append(sent)
        elif any(k in low for k in chemical_kw):
            remedy_chemical_parts.append(sent)
        else:
            if len(sent.split()) < 20:
                remedy_natural_parts.append(sent)
            else:
                remedy_chemical_parts.append(sent)

    remedy_natural = " ".join(remedy_natural_parts)
    remedy_chemical = " ".join(remedy_chemical_parts)

    short_answer = " ".join(sentences[:2]).strip()
    return {
        "cause": cause,
        "prevention": prevention,
        "remedy": remedy,
        "remedy_natural": remedy_natural,
        "remedy_chemical": remedy_chemical,
        "short_answer": short_answer,
        "requires_human_review": False,
        "chemicals_mentioned": []
    }
