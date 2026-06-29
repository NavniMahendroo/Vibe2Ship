import requests

# Test registration
print("Testing registration...")
r = requests.post('http://localhost:8001/api/auth/register', json={'email':'lolol@gmail.com','password':'password123','name':'lol'})
print(f"Register status: {r.status_code}, response: {r.text}")

if r.status_code == 201:
    # Test login
    print("\nTesting login...")
    r2 = requests.post('http://localhost:8001/api/auth/login', json={'email':'lolol@gmail.com','password':'password123'})
    print(f"Login status: {r2.status_code}, response: {r2.text}")
    
    if r2.status_code == 200:
        token = r2.json()['access_token']
        # Test /api/auth/me
        print("\nTesting /api/auth/me...")
        r3 = requests.get('http://localhost:8001/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        print(f"Me status: {r3.status_code}, response: {r3.text}")
