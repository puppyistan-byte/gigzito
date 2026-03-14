import requests

TRUSTED_ZONES = ['instagram.com', 'facebook.com', 'tiktok.com', 'discord.com', 'gigzito.com']
BIF_API_URL = "http://localhost:8000/scan"

def is_content_safe(message, local_file_path=None):
    # Skip scan for trusted links
    if hasattr(message, 'text') and message.text:
        if any(zone in message.text.lower() for zone in TRUSTED_ZONES):
            print("Safe Zone link detected. Passing.")
            return True

    # Scan direct uploads
    if local_file_path and os.path.exists(local_file_path):
        try:
            response = requests.post(BIF_API_URL, json={"file_path": local_file_path})
            data = response.json()
            scores = data.get('scores', {})
            
            # If Porn or Hentai > 80%, it's a no-go
            if scores.get('porn', 0) > 0.8 or scores.get('hentai', 0) > 0.8:
                return False
        except Exception as e:
            print(f"Bif Scanner Error: {e}")
    
    return True
