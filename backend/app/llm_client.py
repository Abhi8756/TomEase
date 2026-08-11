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


def synthesize_structured(snippets: str, structured_sources: list = None) -> Dict[str, Any]:
    """Ask the remote LLM to produce citation-grounded structured fields.
    
    Args:
        snippets: Plain text snippets (fallback)
        structured_sources: List of dicts with {id, text, citation, page, authority, topic}
    
    Returns:
        Dict with cause, prevention, remedy_natural, remedy_chemical, sources with citations, etc.
    """
    system = (
        "You are an expert agronomist specializing in evidence-based tomato disease management. "
        "Your task is to synthesize structured information from the provided sources. "
        "CRITICAL RULES:\n"
        "1. Ground every statement in provided sources using their S-IDs (e.g., S1, S2)\n"
        "2. Keep prevention and remedy items as lists of bullet points\n"
        "3. Do NOT invent pesticide doses or forbidden chemicals\n"
        "4. If doses appear in sources, set requires_human_review=true\n"
        "5. Use chemicals_mentioned array for all chemical names found\n"
        "6. confidence_note should explain evidence quality (e.g., 'high consensus', 'limited sources')\n"
        "7. Output ONLY valid JSON matching the schema\n"
    )

    # Format structured evidence with source IDs
    if structured_sources:
        evidence_block = "STRUCTURED SOURCES:\n\n"
        for i, src in enumerate(structured_sources, 1):
            src_id = src.get("id", f"S{i}")
            evidence_block += (
                f"{src_id}. Authority: {src.get('authority', 'Unknown')}\n"
                f"   Citation: {src.get('citation', 'Unknown')}\n"
                f"   Page: {src.get('page', 'N/A')}\n"
                f"   Topic: {src.get('topic', 'General')}\n"
                f"   Evidence: {src.get('text', '')}\n\n"
            )
        
        user_messages = (
            f"{evidence_block}\n"
            "Produce a JSON object with this exact structure:\n"
            "{\n"
            '  "short_answer": "1-2 sentence clinical summary",\n'
            '  "cause": "What causes this disease (pathogen, conditions)",\n'
            '  "prevention": ["Practice 1", "Practice 2", ...],\n'
            '  "remedy_natural": ["Organic option 1", "Organic option 2", ...],\n'
            '  "remedy_chemical": ["Chemical option 1", "Chemical option 2", ...],\n'
            '  "chemicals_mentioned": ["chemical1", "chemical2"],\n'
            '  "requires_human_review": false,\n'
            '  "confidence_note": "Evidence quality explanation",\n'
            '  "sources": [{"id": "S1", "citation": "Author (Year)", "page": 12}, ...]\n'
            "}\n\n"
            "Reference source IDs (S1, S2, etc.) in your sources array. "
            "If a source is referenced, it must be listed."
        )
    else:
        # Fallback format (no structured sources)
        user_messages = (
            "Here are the top retrieved snippets:\n\n" + snippets + "\n\n"
            "Produce a JSON object with this exact structure:\n"
            "{\n"
            '  "short_answer": "1-2 sentence clinical summary",\n'
            '  "cause": "What causes this disease",\n'
            '  "prevention": ["Practice 1", "Practice 2", ...],\n'
            '  "remedy_natural": ["Organic option 1", ...],\n'
            '  "remedy_chemical": ["Chemical option 1", ...],\n'
            '  "chemicals_mentioned": [],\n'
            '  "requires_human_review": false,\n'
            '  "confidence_note": "Evidence quality",\n'
            '  "sources": []\n'
            "}"
        )

    out = call_chat_completion(system, user_messages, max_tokens=1024)
    if not out:
        # Fallback to heuristic summarizer
        return _heuristic_summarize(snippets, structured_sources)

    # Try to parse JSON from the LLM response
    try:
        s = out.strip()
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1:
            raw = s[start:end+1]
            parsed = json.loads(raw)
        else:
            parsed = json.loads(s)
        
        # Ensure required fields with correct types
        parsed.setdefault("cause", "")
        parsed.setdefault("prevention", [] if isinstance(parsed.get("prevention"), list) else [])
        parsed.setdefault("remedy_natural", [] if isinstance(parsed.get("remedy_natural"), list) else [])
        parsed.setdefault("remedy_chemical", [] if isinstance(parsed.get("remedy_chemical"), list) else [])
        parsed.setdefault("chemicals_mentioned", [])
        parsed.setdefault("requires_human_review", False)
        parsed.setdefault("confidence_note", "")
        parsed.setdefault("sources", [])
        parsed.setdefault("short_answer", "")
        return parsed
    except Exception as e:
        print(f"[LLM] JSON parse error: {e}")
        return _heuristic_summarize(snippets, structured_sources)


def _heuristic_summarize(snippets: str, structured_sources: list = None) -> Dict[str, Any]:
    """Very simple extractor: look for sentences containing keywords and return short aggregated answers.
    
    Args:
        snippets: Plain text snippets
        structured_sources: List of source dicts with {id, text, citation, page, authority, topic}
    """
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
    prevention_list = find_lines(prevention_kw)
    remedy = " ".join(find_lines(remedy_kw))

    # Heuristic split: natural vs chemical
    natural_kw = ["organic", "neem", "compost", "biocontrol", "mulch", "crop rotation", "cultural", "remove", "sanitize", "prune"]
    chemical_kw = ["fungicide", "pesticide", "spray", "chlorothalonil", "mancozeb", "copper", "difenoconazole", "azoxystrobin"]
    remedy_natural_parts = []
    remedy_chemical_parts = []
    chemicals = set()
    
    for sent in find_lines(remedy_kw):
        low = sent.lower()
        # Extract chemical names
        for chem in chemical_kw:
            if chem in low:
                chemicals.add(chem)
        
        if any(k in low for k in natural_kw):
            remedy_natural_parts.append(sent)
        elif any(k in low for k in chemical_kw):
            remedy_chemical_parts.append(sent)
        else:
            if len(sent.split()) < 20:
                remedy_natural_parts.append(sent)
            else:
                remedy_chemical_parts.append(sent)

    remedy_natural = remedy_natural_parts if remedy_natural_parts else []
    remedy_chemical = remedy_chemical_parts if remedy_chemical_parts else []

    short_answer = " ".join(sentences[:2]).strip()
    
    # Build sources array if structured_sources provided
    sources_array = []
    if structured_sources:
        for i, src in enumerate(structured_sources[:5], 1):  # Top 5 sources
            sources_array.append({
                "id": src.get("id", f"S{i}"),
                "citation": src.get("citation", "Unknown"),
                "page": src.get("page", "N/A")
            })
    
    return {
        "short_answer": short_answer,
        "cause": cause,
        "prevention": prevention_list,
        "remedy_natural": remedy_natural,
        "remedy_chemical": remedy_chemical,
        "chemicals_mentioned": list(chemicals),
        "requires_human_review": len(chemicals) > 0,
        "confidence_note": "Extracted from heuristic text analysis" + (f" ({len(sources_array)} sources)" if sources_array else ""),
        "sources": sources_array
    }
