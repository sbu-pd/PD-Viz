from collections import defaultdict

def reaction_time(data):
    '''
    This function converts raw data for 'Reaction Time' to time delay lists
    Input : list of dict(instances)
    eg:
    [
        {
            "-NkGN89Wc0MIqUTl1RJN": {
                "Pressed": 1701098615534,
                "button_displayed": 1701098615116
            },
            "-NkGN8ByQXZGlCGmcEC8": {
                "Released": 1701098615691,
                "button_displayed": 1701098615116
            },
            "-NkGNB4tm0_xI-oMPJOB": {
                "Pressed": 1701098627528,
                "button_displayed": 1701098626809,
                "button_released": 1701098624391
            },
            "-NkGNB7NPljxPRuYsRKQ": {
                "Released": 1701098627686,
                "button_displayed": 1701098626809,
                "button_released": 1701098624391
            }
        },
    ]

    Output: List[List], List[List]
    It outputs list of delay between btn_displayed and pressed in one instance(test),
    delay between btn_released and released in one instance(test).
    eg:
    [[418, 719], [920, 1323, 460]], [[422, 1000], [505, 921, 121]]
    '''
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = reaction_time(user_data)
        return res
    else:
        reaction_display_list, reaction_release_list = list(), list()
        for data_chunk in data:
            for session_date, data_pts in data_chunk.items():
                reaction_display_dict = dict()
                reaction_release_dict = dict()
                for _, val in data_pts.items():
                    if 'button_displayed' in val:
                        if val['button_displayed'] not in reaction_display_dict:
                            reaction_display_dict[val['button_displayed']] = val.get("Pressed", None)

                    if 'button_released' in val:
                        if val['button_released'] not in reaction_release_dict:
                            reaction_release_dict[val['button_released']] = val.get("Released", None)

                reaction_display_list.append({session_date : [v-k for k, v in reaction_display_dict.items() if type(v) is int and type(k) is int]})
                reaction_release_list.append({session_date : [v-k for k, v in reaction_release_dict.items() if type(v) is int and type(k) is int]})

        return [reaction_display_list, reaction_release_list]

def handle_raw_acceleration_data(data):
    return_data = {}
    first_val = list(data.values())[0]["time"]
    for k, val in data.items():
        return_data[val["time"] - first_val] = val
    return return_data

def finger_tapping(data):
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = finger_tapping(user_data)
        return res

    try:
        for data_chunk in data:
            for session_date, data_pts in data_chunk.items():
                if session_date not in res:
                    res[session_date] = {}
                for hand, hand_values in data_pts.items():
                    if hand not in res[session_date]:
                        res[session_date][hand] = {}
                    for prop, prop_values in hand_values.items():
                        if prop not in res[session_date][hand]:
                            res[session_date][hand][prop] = []
                        if prop in {"LeftButton", "RightButton"}:
                            pressed, released = [], []
                            for i in prop_values.values():
                                if "Pressed" in i:
                                    pressed.append(i["Pressed"])
                                elif "Released" in i:
                                    released.append(i["Released"])
                            for i in range(len(released)):
                                res[session_date][hand][prop].append(released[i] - pressed[i])
                        if prop == "TapAcceleration":
                            res[session_date][hand][prop] = handle_raw_acceleration_data(prop_values)
                        if prop == "TapCount":
                            print(prop_values[list(prop_values.keys())[-1]])
                            res[session_date][hand][prop] = prop_values[list(prop_values.keys())[-1]]

    except Exception as e:
        print(e)
    return res

def anti_tapping(data):
    res = {}
    if not data:
        return res
    
    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = anti_tapping(user_data)
        return res

    # Initialize the structure for storing the processed data per session
    res = defaultdict(lambda: {
        "reaction_times_pressed": [],
        "reaction_times_released": [],
        "distances_released": []
    })

    for data_chunk in data:
        for session_date, tests in data_chunk.items():
            for hand, hand_tests in tests.items():
                for test_id, test_data in hand_tests.items():
                    if "Pressed" in test_data:
                        for press_event in test_data["Pressed"].values():
                            if "Pressed" in press_event and "button_displayed" in press_event:
                                reaction_time = press_event["Pressed"] - press_event["button_displayed"]
                                res[session_date]["reaction_times_pressed"].append(reaction_time)

                    if "Released" in test_data:
                        for release_event in test_data["Released"].values():
                            if "Released" in release_event and "button_displayed" in release_event:
                                reaction_time = release_event["Released"] - release_event["button_displayed"]
                                res[session_date]["reaction_times_released"].append(reaction_time)

                                # Only "Released" events contain distance
                                if "distance" in release_event and type(release_event['distance']) != dict:
                                    res[session_date]["distances_released"].append(release_event["distance"])

    return dict(res)

def dot_counting(data):
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = dot_counting(user_data)
        return res

    try:
        res = defaultdict(list)

        for trial_data in data:
            for session_date, d in trial_data.items():
                current_session_list = []
                total_trial_count = len(d) - 1
                total_correct = 0
                for data_pt_ in d[1:]:
                    for _, data_pt in data_pt_.items():
                        button_displayed = data_pt["button_displayed"]
                        button_pressed_sequence = ''.join(data_pt["button_pressed"])
                        trial_number = data_pt["trial"]

                        # Determine accuracy
                        is_correct = button_displayed == button_pressed_sequence
                        if is_correct:
                            total_correct += 1
                        current_session_list.append({
                            "trial": trial_number,
                            "button_displayed": button_displayed,
                            "button_pressed_sequence": button_pressed_sequence,
                            "is_correct": is_correct
                        })
                res[session_date].append({
                    'total_trials' : total_trial_count,
                    'total_correct' : total_correct,
                    'all_trials' : current_session_list
                })

        return dict(res)
    except Exception as e:
        print(e)
        return res

def face_name_recognition(data):
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = face_name_recognition(user_data)
        return res

    try:
        res = defaultdict(list)
        for trial_data in data:
            for session_date, session_data in trial_data.items():
                current_session_data = []
                total_trial_count = len(session_data)
                total_correct = 0
                for instance_data in session_data:
                    for _, d in instance_data.items():
                        is_correct = d.get('name_displayed') == d.get('name_pressed')
                        if is_correct:
                            total_correct += 1
                        current_session_data.append({
                            'name_displayed' : d.get('name_displayed'),
                            'name_pressed' : d.get('name_pressed'),
                            'is_correct' : is_correct
                        })
                res[session_date].append({
                    'total_trials' : total_trial_count,
                    'total_correct' : total_correct,
                    'all_trials' : current_session_data
                })
        
        return dict(res)
    except Exception as e:
        print(e)
        return res

def flanker_test(data):
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = flanker_test(user_data)
        return res

    try:
        res = defaultdict(list)
        for trial_data in data:
            for session_date, session_data in trial_data.items():
                current_session_data = []
                total_trial_count = len(session_data) - 1
                total_correct = 0
                for instance_data in session_data[1:]:
                    for _, d in instance_data.items():
                        print(d)
                        is_correct = False
                        if d.get('feedback') == "Correct":
                            total_correct += 1
                            is_correct = True
                        reaction_time = 0
                        if d.get("button_pressed") and d.get("button_displayed"):
                            reaction_time = int(d.get("button_pressed")) - d.get("button_displayed")
                        current_session_data.append({
                            'reaction_time' : reaction_time,
                            'is_correct' : is_correct,
                            'trial': d.get('trial')
                        })

                res[session_date].append({
                    'total_trials': total_trial_count,
                    'total_correct' : total_correct -1,
                    'all_trials' : current_session_data
                })

        return dict(res)
    except Exception as e:
        print(e)
        return None

def running_dots_test(data):
    res = {}
    if not data:
        return res

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = running_dots_test(user_data)
        return res
    try:
        res = defaultdict(list)
        for trial_data in data:
            for session_date, session_data in trial_data.items():
                current_session_data = []
                total_correct = 0
                total_trial_count = len(session_data) - 1
                for instance_data in session_data[1:]:
                    for _, d in instance_data.items():
                        is_correct = True if d.get('is_correct') == 1 else False
                        if is_correct:
                            total_correct += 1
                        current_session_data.append({
                            'dot_count' : d.get('dot_count'),
                            'is_correct' : is_correct
                        })

                res[session_date].append({
                    'total_trials' : total_trial_count,
                    'total_correct' : total_correct,
                    'all_trials': current_session_data
                })

        return dict(res)
    except Exception as e:
        print(e)
        return None    


def acceleration_angvelocity_processor(data):
    if not data:
        return None
    session_data = defaultdict(lambda: {
        "Acceleration": defaultdict(dict),
        "AngularVelocity": defaultdict(dict)
    })

    for data_chunk in data:
        for session_date, acc_data in data_chunk.items():
            for acc, data_pt in acc_data.items():
                time_series_data = {"x":[], "y": [], "z": []}
                for k, v in data_pt.items():
                    time_series_data["x"].append(v.get("x", 0))
                    time_series_data["y"].append(v.get("y", 0))
                    time_series_data["z"].append(v.get("z", 0))
                session_data[session_date][acc] = time_series_data

    session_data = {date: {acc_type: dict(acc_data) for acc_type, acc_data in sessions.items()} for date, sessions in session_data.items()}
    return session_data

def balance_test(data):
    res = {}

    if not data:
        return None

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = balance_test(user_data)
        return res
    
    try:
        return acceleration_angvelocity_processor(data)
    except Exception as e:
        print(e)
        return None

def tremors_test(data):
    res = {}
    if not data:
        return None

    if type(data) == dict:
        for user, user_data in data.items():
            res[user] = tremors_test(user_data)
        return res
    
    try:
        res = defaultdict(lambda: {
            "Left": {
                "Acceleration": defaultdict(dict),
                "AngularVelocity": defaultdict(dict),
            },
            "Right": {
                "Acceleration": defaultdict(dict),
                "AngularVelocity": defaultdict(dict),
            }
        })

        for data_chunk in data:
            for session_date, hands_data in data_chunk.items():
                for hand, acc_data in hands_data.items():
                    for acc_type, data_pt in acc_data.items():
                        time_series_data = {"x":[], "y": [], "z": []}
                        for k, v in data_pt.items():
                            time_series_data["x"].append(v.get("x", 0))
                            time_series_data["y"].append(v.get("y", 0))
                            time_series_data["z"].append(v.get("z", 0))
                        res[session_date][hand][acc_type] = time_series_data

        # Convert defaultdicts to regular dicts
        res = {
            date: {
                hand: {
                    acc_type: dict(acc_data) for acc_type, acc_data in hands.items()
                } for hand, hands in sessions.items()
            } for date, sessions in res.items()
        }

        return res
    except Exception as e:
        print(e)
        return None


def dummy_func(data):
    return {}


func_mapper = {
    "AntiTapping": anti_tapping,
    "BalanceTest": balance_test,
    "DotCounting": dot_counting,
    "FaceNameRecognition": face_name_recognition,
    "FingerTapping": finger_tapping,
    "FlankerTest": flanker_test,
    "ReactionTime": reaction_time,
    "RunningDotTest": running_dots_test,
    "TremorsTest": tremors_test,
    "WalkTest": balance_test
}

def process_data(data, user_filter, test_filter):
    print(user_filter, test_filter)
    if user_filter and test_filter:
        return func_mapper[test_filter](data)
    elif user_filter:
        return []
    elif test_filter:
        return func_mapper[test_filter](data)
    else:
        return []