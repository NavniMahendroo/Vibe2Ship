import os
import json
import base64
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config Gemini
API_KEY = os.getenv("GEMINI_API_KEY", "")
HAS_API_KEY = bool(API_KEY and API_KEY != "")

client = None
if HAS_API_KEY:
    client = genai.Client(api_key=API_KEY)


def get_fallback_analysis(reason_text: str, history_summary: str) -> dict:
    """
    Deterministic fallback for extension analysis when the Gemini API is unavailable or fails.
    """
    logger.info("Using fallback analyzer for extension analysis.")
    text = (reason_text or "").lower()
    
    # Categorize based on keywords in the text
    if any(kw in text for kw in ["bug", "error", "code", "database", "api", "crash", "compile", "dependency", "library", "technical"]):
        tag = "Technical Blocker"
        reflection = "This looks like a technical issue. Consider writing small proof-of-concept tests or spikes earlier."
        severity = 2
    elif any(kw in text for kw in ["estimate", "time", "longer", "harder", "thought", "hours", "days"]):
        tag = "Underestimated Effort"
        reflection = "Task effort was underestimated. Break down the scope and add a 20% time buffer next time."
        severity = 1
    elif any(kw in text for kw in ["client", "team", "manager", "wait", "dependencies", "approval", "external"]):
        tag = "External Dependency"
        reflection = "Blocked by external factors. Establish clear intermediate milestones to avoid waiting."
        severity = 2
    elif any(kw in text for kw in ["scope", "add", "feature", "change", "requirement", "extra", "more"]):
        tag = "Scope Creep"
        reflection = "Scope creep detected. Freeze requirements and implement core features first."
        severity = 3
    else:
        tag = "Personal"
        reflection = "Personal schedule or energy levels shifted. Incorporate personal downtime in scheduling."
        severity = 1

    # Personalize the reflection using history_summary if possible
    # e.g., "This is the third time a library issue blocked you..."
    if "Technical Blocker" in history_summary and tag == "Technical Blocker":
        reflection = "This is a recurring technical blocker. Consider allocating dedicated R&D time before coding."
    elif "Underestimated Effort" in history_summary and tag == "Underestimated Effort":
        reflection = "You repeatedly underestimate effort here. Double your initial duration estimates."
    elif "External Dependency" in history_summary and tag == "External Dependency":
        reflection = "Another external block encountered. Follow up with stakeholders 24 hours prior to deadline."

    return {
        "tag": tag,
        "reflection": f"[AI Offline] {reflection}",
        "severity": severity,
        "transcription": reason_text or "Voice note recorded."
    }


def analyze_extension_text(reason_text: str, history_summary: str) -> dict:
    """
    Sends the extension text and user's history summary to Gemini.
    Returns: { "tag": str, "reflection": str, "severity": int, "transcription": str }
    """
    if not HAS_API_KEY or not client:
        return get_fallback_analysis(reason_text, history_summary)

    prompt = f"""
    You are the Drift Smart Extension Coach, an AI system that helps users analyze why they are extending their deadlines.
    
    The user is extending their task's deadline and gave the following reason:
    "{reason_text}"

    Here is a summary of the user's history of extensions:
    "{history_summary}"

    Analyze the user's reason and return a JSON object. You must classify the delay into one of the following tags:
    - 'Technical Blocker' (e.g., library issues, bugs, environment setup)
    - 'Underestimated Effort' (e.g., took longer, coding was harder than thought)
    - 'External Dependency' (e.g., waiting for client/manager/team feedback or API access)
    - 'Scope Creep' (e.g., adding extra features, redesigning halfway)
    - 'Personal' (e.g., sick, tired, personal schedule conflicts)

    Create a helpful one-sentence reflection referencing their history. For example:
    "This is the third time a library issue blocked you — consider spiking dependencies earlier."
    If history is empty, provide a constructive reflection on how to avoid this issue next time.
    
    Rate the severity of this extension from 1 (minor/unavoidable) to 3 (critical/avoidable pattern).

    Return EXACTLY a JSON object with these keys:
    {{
        "tag": "one of the 5 categories listed above",
        "reflection": "a helpful one-sentence reflection addressing history",
        "severity": 1, 2, or 3
    }}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        data = json.loads(response.text.strip())
        return {
            "tag": data.get("tag", "Underestimated Effort"),
            "reflection": data.get("reflection", "Be mindful of your timeline estimations."),
            "severity": data.get("severity", 1),
            "transcription": reason_text
        }
    except Exception as e:
        logger.error(f"Error in Gemini text analysis: {e}")
        return get_fallback_analysis(reason_text, history_summary)


def analyze_extension_audio(audio_bytes: bytes, mime_type: str, history_summary: str) -> dict:
    """
    Sends the voice note (audio bytes) and history summary to Gemini in a single API call.
    Transcribes the audio, classifies the delay, and generates a reflection.
    Returns: { "tag": str, "reflection": str, "severity": int, "transcription": str }
    """
    if not HAS_API_KEY or not client:
        return get_fallback_analysis("Voice recording submitted.", history_summary)

    prompt = f"""
    You are the Drift Smart Extension Coach. The attached audio file contains a voice note from a user explaining why they are extending their task deadline.
    
    Perform two tasks in a single API call:
    1. Transcribe the audio word-for-word. Put the exact transcription in the 'transcription' field.
    2. Analyze the reason from the transcription.
    
    Here is a summary of the user's history of extensions:
    "{history_summary}"

    Classify the reason into one of these tags:
    - 'Technical Blocker'
    - 'Underestimated Effort'
    - 'External Dependency'
    - 'Scope Creep'
    - 'Personal'

    Write a helpful one-sentence reflection referencing their history. For example:
    "This is the third time a library issue blocked you — consider spiking dependencies earlier."
    If history is empty, provide a constructive reflection on how to avoid this issue next time.
    
    Rate the severity from 1 (minor/unavoidable) to 3 (critical/avoidable pattern).

    Return EXACTLY a JSON object with these keys:
    {{
        "transcription": "the exact word-for-word text transcription of the audio",
        "tag": "one of the 5 categories listed above",
        "reflection": "a helpful one-sentence reflection addressing history",
        "severity": 1, 2, or 3
    }}
    """

    try:
        # Structure content array with audio bytes and the text prompt
        contents = [
            types.Part.from_bytes(
                data=audio_bytes,
                mime_type=mime_type
            ),
            prompt
        ]
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        data = json.loads(response.text.strip())
        return {
            "tag": data.get("tag", "Underestimated Effort"),
            "reflection": data.get("reflection", "Be mindful of your timeline estimations."),
            "severity": data.get("severity", 1),
            "transcription": data.get("transcription", "Voice note transcription unavailable.")
        }
    except Exception as e:
        logger.error(f"Error in Gemini audio analysis: {e}")
        return get_fallback_analysis("Voice recording uploaded.", history_summary)
