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

    res = {}
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

def dummy_func(data):
    return {}


func_mapper = {
    "AntiTapping": anti_tapping,
    "BalanceTest": dummy_func,
    "DotCounting": dummy_func,
    "FaceNameRecognition": dummy_func,
    "FingerTapping": finger_tapping,
    "FlankerTest": dummy_func,
    "ReactionTime": reaction_time,
    "RunningDotTest": dummy_func,
    "TremorsTest": dummy_func,
    "WalkTest": dummy_func
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