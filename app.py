import os
import json
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, db
from flask import Flask, jsonify, request, render_template

from data_wrangler import process_data
load_dotenv()

app = Flask(__name__)

firebase_credentials = {
    "type": os.getenv("FIREBASE_TYPE"),
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
}
cred = credentials.Certificate(firebase_credentials)
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://pd-app-8c25c-default-rtdb.firebaseio.com/'
})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-users-tests', methods=['GET'])
def get_users_tests():
    user_filter = request.args.get('user', None)
    test_filter = request.args.get('test', None)

    query_ref = db.reference('PDAPP')
    raw_data, plot_data = {}, {}
    response_data = {}

    if user_filter and test_filter:
        # Fetch all sessions for a specific user
        user_sessions_ref = query_ref.child(user_filter).get() or {}
        # Initialize a list to hold the data for the specified test across all sessions
        test_data_list = []
        
        # Iterate through each session in the user's data
        for session_id, tests in user_sessions_ref.items():
            # Check if the specified test exists in this session
            if test_filter in tests:
                # Append the test data to the list
                test_data_list.append({session_id: tests[test_filter]})
                
        # Assign the list to the response data structure
        raw_data = {user_filter: {test_filter: test_data_list}}
        
    elif user_filter:
        # Specific user: Return all tests this user has performed, with count
        user_tests = query_ref.child(user_filter).get()
        tests_count = {}
        for session in user_tests.values():
            for test_name in session:
                tests_count[test_name] = tests_count.get(test_name, 0) + 1
        raw_data[user_filter] = tests_count

    elif test_filter:
        # Specific test: Return all users data for this test
        all_users = query_ref.get()
        for user_id, sessions in all_users.items():
            for session_id, tests in sessions.items():
                if test_filter in tests:
                    if user_id not in raw_data:
                        raw_data[user_id] = []
                    raw_data[user_id].append({session_id: tests[test_filter]})

    else:
        # No filters: Return count of each test across all users and sessions
        all_users = query_ref.get()
        test_counts = {}
        users = []
        for user_id, sessions in all_users.items():
            users.append(user_id)
            for session_id, tests in sessions.items():
                for test_name in tests.keys():
                    test_counts[test_name] = test_counts.get(test_name, 0) + 1
        raw_data = {"users":users, "tests":test_counts}

    plot_data = process_data(raw_data, user_filter, test_filter)
    response_data = {"raw_data": raw_data, "plot_data": plot_data}

    with open("./raw.json", "w+") as fp:
        json.dump(raw_data, fp, indent=4)
        print("Stored raw data in json")

    with open("./plot.json", "w+") as fp:
        json.dump(plot_data, fp, indent=4)
        print("Stored plot data in json")
    return jsonify(response_data)

# if __name__ == '__main__':
#     app.run(debug=True)