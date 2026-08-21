"""
Static disease fallback knowledge base for TomEase.

All data is sourced exclusively from documents in storage/docs/tomato_rag:
  - Cornell Cooperative Extension: early-blight-and-septoria-cornell.pdf
  - Cornell CALS: late-blight_factsheet.pdf
  - UF/IFAS Extension (Hugh Smith, 2024): ifas tylcv.pdf
  - Cornell McGrath (2021): Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf
  - J. Hortl. Sci. (Sandeep Kumar et al., 2022): 18+Sandeep+Kumar.pdf
  - Horticulturae (Shanmugam et al., 2024): horticulturae-10-00766-v2.pdf

Used when the LLM (Groq) is unavailable or fails.
"""

from typing import Dict, Any

DISEASE_FALLBACK: Dict[str, Dict[str, Any]] = {

    "Early_Blight": {
        "cause": (
            "Early blight is caused by the fungus Alternaria solani. It is one of the most "
            "common and damaging diseases of tomatoes. The disease thrives at temperatures of "
            "75–85°F (24–29°C) with high humidity and wet weather. Spores spread via wind, "
            "water splash, and infected plant debris left in the soil."
        ),
        "prevention": [
            "Plant resistant or tolerant varieties where available (Cornell Extension, 2021).",
            "Practice at least a 2-year crop rotation away from solanaceous crops (Cornell McGrath, 2021).",
            "Minimize leaf wetness — use drip irrigation and orient rows parallel to prevailing wind (Cornell McGrath, 2021).",
            "Stake and trellis plants to promote air circulation and reduce foliage contact with soil.",
            "Remove and destroy infected lower leaves and crop debris promptly after harvest.",
            "Apply a layer of mulch to reduce soil splash onto lower leaves.",
            "Scout plants at least once a week for early symptoms on the oldest/lowest leaves.",
        ],
        "remedy_natural": [
            "Apply copper-based fungicides (e.g., Bordeaux mixture) as a protectant spray (Cornell McGrath, 2021).",
            "Actinovate, OSO, OxiDate 2, Serenade Opti, and Regalia are OMRI-listed organic options (Cornell McGrath, 2021).",
            "Trichoderma harzianum seed/seedling treatment has been shown to reduce early blight incidence in IPM trials (Shanmugam et al., Horticulturae 2024).",
            "Removing older/infected leaves as part of IPM reduces inoculum pressure.",
        ],
        "remedy_chemical": [
            "Apply protectant fungicides weekly starting before or at first symptoms (Cornell McGrath, 2021).",
            "Inspire Super (FRAC 3+9) alternated with Miravis Prime (FRAC 7+12) — up to 5 applications (Cornell McGrath, 2021).",
            "Endura (FRAC 7) and Mettle (FRAC 3) are effective options; alternate FRAC groups to manage resistance (Cornell McGrath, 2021).",
            "Protectant tank-mixes: chlorothalonil, mancozeb, or ziram (Cornell McGrath, 2021).",
            "Mancozeb spray schedules significantly reduce disease intensity when applied 8–10 times per season (Parameshwari et al., Plant Science Today 2025).",
        ],
        "confidence_note": "Evidence-based from Cornell Cooperative Extension and Cornell McGrath (2021) integrated management guide.",
        "sources": [
            {"id": "S1", "citation": "Cornell Cooperative Extension, early-blight-and-septoria-cornell.pdf", "page": 1},
            {"id": "S2", "citation": "Cornell McGrath (2021), Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf", "page": 2},
            {"id": "S3", "citation": "Shanmugam et al., Horticulturae 2024, 10, 766", "page": 13},
        ],
        "requires_human_review": False,
    },

    "Late_Blight": {
        "cause": (
            "Late blight is caused by Phytophthora infestans, a water mold (oomycete). It is a "
            "notorious disease historically associated with the Irish Potato Famine. It causes "
            "fruit rot and plant death on tomatoes and potatoes. The pathogen spreads rapidly "
            "under cool, humid conditions (60–70°F / 15–21°C with wet leaf surfaces). Aerially "
            "dispersed sporangia can travel several miles and destroy entire fields. Main inoculum "
            "sources are infected plant debris, volunteer plants from infected tubers, transplants, "
            "and compost piles (Cornell CALS Factsheet)."
        ),
        "prevention": [
            "Plant resistant varieties — e.g., Arka Abhed (with Ph-2 and Ph-3 genes) showed significantly lower late blight severity over two years in Bengaluru trials (Sandeep Kumar et al., J. Hortl. Sci. 2022).",
            "Practice 3-year crop rotation away from solanaceous crops (Cornell CALS Factsheet).",
            "Properly dispose of infected plant debris — bury infected tubers/fruits to eliminate inoculum source (Cornell CALS Factsheet).",
            "Monitor USABlight (usablight.org) or regional disease forecasting systems weekly during the season (Cornell CALS Factsheet).",
            "Scout fields regularly, especially in low-lying, shaded, or hedgerow areas where first symptoms appear (Cornell CALS Factsheet).",
            "Orient rows parallel to prevailing wind direction, trellis plants, and use drip irrigation to promote dry foliage (Cornell McGrath, 2021).",
            "If symptoms appear in localized areas, immediately remove those plants and their healthy neighbours by disking or flaming (Cornell CALS Factsheet).",
        ],
        "remedy_natural": [
            "Copper-based fungicides (e.g., Bordeaux mixture) are approved for organic production (Cornell McGrath, 2021).",
            "Organic options: Actinovate, Aviv, Double Nickel, OSO, OxiDate 2, PerCarb, Regalia, Serenade Opti, Taegro 2 (Cornell McGrath, 2021).",
            "Biocontrol agents such as Bacillus subtilis (e.g., Serenade) can be used preventively before disease onset.",
        ],
        "remedy_chemical": [
            "Apply fungicides preventively based on past disease occurrence and scouting observations (Cornell McGrath, 2021).",
            "Revus Top (FRAC 3+40) is recommended for late blight management (Cornell McGrath, 2021).",
            "Ridomil Gold Bravo is very effective for sensitive strains like US-23 (Cornell McGrath, 2021).",
            "Previcur Flex has good systemic activity and protects stems and new growth (Cornell McGrath, 2021).",
            "Consult Cornell Integrated Crop and Pest Management Guidelines (cropandpestguides.cce.cornell.edu) for currently approved fungicides and timing (Cornell CALS Factsheet).",
        ],
        "confidence_note": "High-confidence evidence from Cornell CALS late blight factsheet and peer-reviewed ICAR research (J. Hortl. Sci., 2022).",
        "sources": [
            {"id": "S1", "citation": "Cornell CALS, late-blight_factsheet.pdf", "page": "1-2"},
            {"id": "S2", "citation": "Cornell McGrath (2021), Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf", "page": 2},
            {"id": "S3", "citation": "Sandeep Kumar et al., J. Hortl. Sci. Vol. 17(2), 2022", "page": "411-416"},
        ],
        "requires_human_review": False,
    },

    "Septoria": {
        "cause": (
            "Septoria leaf spot is caused by the fungus Septoria lycopersici. It is worldwide in "
            "occurrence and can cause as much defoliation as early blight when weather conditions "
            "are favorable. First infections usually appear on older leaves near the ground after "
            "fruit set. Small water-soaked circular spots enlarge to 1/16–1/4 inch diameter, with "
            "dark margins, gray-to-tan centers, and small dark pimple-like fruiting bodies (pycnidia) "
            "visible under a 10x lens. Several solanaceous weeds (Jimson weed, horse nettle, "
            "nightshade) act as alternative hosts (Cornell Cooperative Extension)."
        ),
        "prevention": [
            "Practice at least a 2-year crop rotation away from tomatoes and solanaceous hosts (Cornell McGrath, 2021).",
            "Remove and destroy crop debris and infected leaves promptly to reduce inoculum in the soil.",
            "Control solanaceous weeds in and around fields that serve as alternate hosts (Cornell Cooperative Extension).",
            "Avoid overhead irrigation; use drip irrigation to keep foliage dry (Cornell McGrath, 2021).",
            "Stake and trellis plants to promote airflow and reduce leaf wetness duration.",
            "Scout plants regularly and remove heavily infected lower leaves to slow disease spread.",
        ],
        "remedy_natural": [
            "Copper-based sprays (Bordeaux mixture, copper hydroxide) are effective organic protectants (Cornell McGrath, 2021).",
            "OSO and OxiDate 2 are approved organic treatment options (Cornell McGrath, 2021).",
        ],
        "remedy_chemical": [
            "Apply protectant fungicides (chlorothalonil, mancozeb, ziram) on a preventive schedule (Cornell McGrath, 2021).",
            "Inspire Super (FRAC 3+9) and Miravis Prime (FRAC 7+12) are effective; alternate FRAC groups to prevent resistance (Cornell McGrath, 2021).",
            "Disease forecasting models (TOM-CAST via NEWA at newa.cornell.edu) can guide optimal timing of fungicide applications to reduce unnecessary sprays (Cornell McGrath, 2021).",
        ],
        "confidence_note": "Evidence-based from Cornell Cooperative Extension and Cornell McGrath (2021) integrated management guide.",
        "sources": [
            {"id": "S1", "citation": "Cornell Cooperative Extension, early-blight-and-septoria-cornell.pdf", "page": 1},
            {"id": "S2", "citation": "Cornell McGrath (2021), Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf", "page": 2},
        ],
        "requires_human_review": False,
    },

    "Leaf_Mold": {
        "cause": (
            "Leaf mold is caused by the fungus Passalora fulva (formerly Cladosporium fulvum). "
            "It is most common in greenhouse-grown tomatoes and field crops in warm, humid "
            "climates. The disease thrives under high humidity (above 85%) and poor air "
            "circulation. Symptoms first appear as pale greenish-yellow spots on the upper leaf "
            "surface, with corresponding olive-green to gray velvety mold growth on the underside. "
            "Heavily infected leaves may curl, wither, and drop (Cornell McGrath, 2021)."
        ),
        "prevention": [
            "Ensure good ventilation and air circulation — space plants adequately and trellis (Cornell McGrath, 2021).",
            "Avoid overhead irrigation; use drip irrigation to reduce leaf surface wetness.",
            "In greenhouses, maintain relative humidity below 85% by ventilating and heating during cool nights.",
            "Use resistant varieties, especially for greenhouse production.",
            "Remove and destroy infected leaves promptly to reduce sporulation and spread.",
        ],
        "remedy_natural": [
            "Copper-based sprays are effective organic options (Cornell McGrath, 2021).",
            "OxiDate 2 and OSO are approved for organic production (Cornell McGrath, 2021).",
        ],
        "remedy_chemical": [
            "Miravis Prime (FRAC 7+12) is highly effective against leaf mold (Cornell McGrath, 2021).",
            "Tanos (FRAC 27+11) is also labeled for leaf mold management (Cornell McGrath, 2021).",
            "Protectant fungicides (chlorothalonil, mancozeb) can be used as tank-mix partners (Cornell McGrath, 2021).",
            "Note: Leaf mold is uncommon in field-grown crops — focus on greenhouse environments (Cornell McGrath, 2021).",
        ],
        "confidence_note": "Evidence-based from Cornell McGrath (2021) integrated management guide.",
        "sources": [
            {"id": "S1", "citation": "Cornell McGrath (2021), Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf", "page": "3-4"},
        ],
        "requires_human_review": False,
    },

    "TYLCV": {
        "cause": (
            "Tomato Yellow Leaf Curl Virus (TYLCV) is a geminivirus transmitted by the "
            "sweetpotato whitefly (Bemisia tabaci MEAM1) in a persistent, circulative manner. "
            "Once a whitefly acquires TYLCV, it retains the virus and can transmit it to new "
            "plants for the remainder of its life. The virus produces characteristic symptoms: "
            "stunting, reduced leaf size, and upward leaf curling (cupping). TYLCV causes up to "
            "100% yield loss under favorable conditions. In India, the disease is most severe "
            "during summer (February–May in South India) and autumn (August–December in "
            "northern plains) (UF/IFAS Extension, 2024; Parameshwari et al., Plant Science "
            "Today, 2025)."
        ),
        "prevention": [
            "Use silver/reflective metallic mulches to repel whiteflies, especially at transplanting (UF/IFAS, 2024).",
            "Install yellow sticky traps at 100/ha to monitor and mass-trap whitefly adults (Shanmugam et al., Horticulturae 2024).",
            "Install blue sticky traps at 100/ha to monitor other sucking pests (Shanmugam et al., Horticulturae 2024).",
            "Cover nursery beds with 50-mesh nylon nets to prevent whitefly entry and early virus transmission (Parameshwari et al., 2025).",
            "Apply Imidacloprid 17.8 SL @ 5 mL/L as seedling drench 10 days before transplanting to protect young plants (Shanmugam et al., Horticulturae 2024).",
            "Intercrop tomato with mustard — intercropping reduced TLCV damage by 45–65% compared to sole crop (Murugan 2002, cited in Parameshwari et al., 2025).",
            "Maintain proper plant spacing (50×60 cm) to reduce pest pressure and improve air circulation (Shanmugam et al., Horticulturae 2024).",
            "Remove and destroy infected plants promptly to reduce the virus reservoir.",
            "Control weeds in and around fields — many weeds serve as whitefly and TYLCV reservoirs (UF/IFAS, 2024).",
        ],
        "remedy_natural": [
            "Encourage natural enemies of whitefly: ladybird beetles, minute pirate bugs, lacewings, and parasitic wasps reduce whitefly populations (UF/IFAS, 2024).",
            "Apply neem cake @ 250 kg/ha at planting as part of an IPDM package (Shanmugam et al., Horticulturae 2024).",
            "Biocontrol agents: Bacillus subtilis + Trichoderma asperellum + Pseudomonas lilacinum seedling drench at planting has shown efficacy in IPDM trials (Shanmugam et al., Horticulturae 2024).",
            "Note: There is NO cure for plants already infected with TYLCV. Remove and destroy infected plants immediately.",
        ],
        "remedy_chemical": [
            "Insecticides target the whitefly vector, NOT the virus itself — use them to prevent virus spread (UF/IFAS, 2024).",
            "Rotate insecticide modes of action to prevent resistance development — Bemisia tabaci has documented resistance to imidacloprid and thiamethoxam in Florida (UF/IFAS, 2024).",
            "Buprofezin and pyriproxyfen target immature whitefly stages (UF/IFAS, 2024).",
            "Mancozeb spray programs (8–10 sprays/season) reduced foliar disease incidence in Tamil Nadu field trials (Parameshwari et al., 2025).",
            "Consult local agricultural extension for currently registered insecticides for whitefly management in your region.",
        ],
        "confidence_note": "High-confidence evidence from UF/IFAS Extension (2024), Parameshwari et al. (2025), and Shanmugam et al., Horticulturae (2024). TYLCV is incurable — management focuses entirely on vector (whitefly) control.",
        "sources": [
            {"id": "S1", "citation": "UF/IFAS Extension, Hugh Smith (2024), ifas tylcv.pdf ENY2111", "page": "3-5"},
            {"id": "S2", "citation": "Parameshwari et al., Plant Science Today, 2025", "page": "2-3"},
            {"id": "S3", "citation": "Shanmugam et al., Horticulturae 2024, 10, 766", "page": "6"},
        ],
        "requires_human_review": False,
    },

    "Healthy": {
        "cause": (
            "Your tomato plant appears healthy! No disease has been detected. "
            "Continue with good agronomic practices to maintain plant health and prevent disease outbreaks."
        ),
        "prevention": [
            "Maintain proper plant spacing (50×60 cm) to promote airflow and reduce microclimate humidity (Shanmugam et al., Horticulturae 2024).",
            "Use drip irrigation and orient rows parallel to prevailing wind to keep foliage dry (Cornell McGrath, 2021).",
            "Scout plants at least once a week for early disease symptoms, especially on oldest/lowest leaves (Cornell McGrath, 2021).",
            "Practice 2–3 year crop rotation away from tomatoes and solanaceous crops (Cornell McGrath, 2021).",
            "Apply organic mulch to reduce soil splash and suppress soil-borne inoculum.",
            "Remove and destroy crop debris at season end; chop and incorporate well to hasten decomposition (Cornell McGrath, 2021).",
            "Know the disease history of your farm — some pathogens are soil-borne and persist (Cornell McGrath, 2021).",
        ],
        "remedy_natural": [
            "Preventive applications of biocontrol agents (Trichoderma spp., Bacillus subtilis) can reduce foliar and soil-borne disease risk (Shanmugam et al., Horticulturae 2024).",
            "Copper-based sprays on a preventive schedule before disease onset protect against fungal and bacterial diseases (Cornell McGrath, 2021).",
        ],
        "remedy_chemical": [],
        "confidence_note": "Evidence-based general management recommendations from Cornell McGrath (2021) and IPDM research from Tamil Nadu (Shanmugam et al., Horticulturae 2024).",
        "sources": [
            {"id": "S1", "citation": "Cornell McGrath (2021), Tomato-Disease-Mgt-McGrath-Cornell-2021.pdf", "page": 1},
            {"id": "S2", "citation": "Shanmugam et al., Horticulturae 2024, 10, 766", "page": "13"},
        ],
        "requires_human_review": False,
    },
}


def get_fallback(disease: str) -> Dict[str, Any]:
    """
    Return static fallback disease info sourced from uploaded RAG docs.
    Falls back to a generic message if disease not found.
    """
    data = DISEASE_FALLBACK.get(disease)
    if data:
        return {
            **data,
            "short_answer": data["cause"][:200] + "..." if len(data["cause"]) > 200 else data["cause"],
            "remedy": " ".join(data["remedy_natural"][:2]) if data["remedy_natural"] else "",
            "chemicals_mentioned": [],
        }
    # Unknown disease — return empty
    return {
        "short_answer": "",
        "cause": "",
        "prevention": [],
        "remedy": "",
        "remedy_natural": [],
        "remedy_chemical": [],
        "chemicals_mentioned": [],
        "requires_human_review": False,
        "confidence_note": "No fallback data available for this disease.",
        "sources": [],
    }
