 {'$and': [{'$or': [{'alarmState': {'$in': ['RAISED', 'UPDATED', 'RETRY']}},
  {'alarmState': 'CLEARED', 'alarmClearedTime': {'$gte': datetime.datetime(2024, 11, 21, 16, 19, 24, 33999, tzinfo=<DstTzInfo 'America/Argentina/Buenos_Aires' -03-1 day, 21:00:00 STD>)}}]}, {'$or': [{'alarmId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'alarmType': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'alarmState': {'$regex': 
'NODO_OPTICO', '$options': 'i'}}, {'clients': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'networkElementId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, 
{'origenId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, 
{'sourceSystemId': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
 {'omArrivalTimestamp': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
  {'alarmRaisedTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
   {'alarmClearedTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
    {'timeDifference': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'timeDifferenceIncident': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
     {'alarmReportingTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
      {'TypeNetworkElement': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
       {'timeResolution': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'sequence': {'$regex': 'NODO_OPTICO', '$options': 'i'}}]}]}


2024-11-22 19:19:24,045 - INFO - pipeline:
 [{'$match': {'$and': [{'$or': [{'alarmState': {'$in': ['RAISED', 'UPDATED', 'RETRY']}}, {'alarmState': 'CLEARED', 'alarmClearedTime': {'$gte': datetime.datetime(2024, 11, 21, 16, 19, 24, 33999, tzinfo=<DstTzInfo 'America/Argentina/Buenos_Aires' -03-1 day, 21:00:00 
STD>)}}]}, {'$or': [{'alarmId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, 
  {'alarmType': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'alarmState': 
    {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'clients': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
     {'networkElementId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'origenId': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
      {'sourceSystemId': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'omArrivalTimestamp': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
       {'alarmRaisedTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'alarmClearedTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, 
       {'timeDifference': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'timeDifferenceIncident': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, 
       {'alarmReportingTime': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'TypeNetworkElement': {'$regex': 'NODO_OPTICO', '$options': 'i'}},
        {'timeResolution': {'$regex': 'NODO_OPTICO', '$options': 'i'}}, {'sequence': {'$regex': 'NODO_OPTICO', '$options': 'i'}}]}]}},
         {'$addFields': {'alarmState': {'$cond': {'if': {'$in': ['$alarmState', ['UPDATED', 'RETRY']]}, 'then': 'RAISED', 'else': '$alarmState'}},
          'timeDifferenceNumeric': {'$round': {'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 60000]}},
           'timeDifferenceNumericIncident': {'$round': {'$divide': [{'$subtract': ['$alarmReportingTime', '$alarmRaisedTime']}, 60000]}},
            'timeDifferenceIncident': {'$concat': [{'$toString': {'$floor': {'$divide': [{'$subtract': ['$alarmReportingTime', '$alarmRaisedTime']}, 60000]}}}, ':', {'$cond': [{'$lt': [{'$mod': [{'$divide': [{'$subtract': ['$alarmReportingTime', '$alarmRaisedTime']}, 1000]}, 60]}, 10]}, {'$concat': ['0', {'$toString': {'$mod': [{'$divide': [{'$subtract': ['$alarmReportingTime', '$alarmRaisedTime']}, 1000]}, 60]}}]}, {'$toString': {'$mod': [{'$divide': [{'$subtract': ['$alarmReportingTime', '$alarmRaisedTime']}, 1000]}, 60]}}]}, ' min']}, 'timeDifference': {'$concat': [{'$toString': {'$floor': {'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 60000]}}}, ':', {'$cond': [{'$lt': [{'$mod': [{'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 1000]}, 60]}, 10]}, {'$concat': ['0', {'$toString': {'$floor': {'$mod': [{'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 1000]}, 60]}}}]}, {'$toString': {'$floor': {'$mod': [{'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 1000]}, 60]}}}]}, ' min']}, 'timeDifferencexxx': {'$concat': [{'$toString': {'$round': {'$divide': [{'$subtract': ['$omArrivalTimestamp', '$alarmRaisedTime']}, 60000]}}}, 'min']}}}, {'$sort': {'omArrivalTimestamp': -1}}, {'$skip': 0}, {'$limit': 15}, {'$project': {'_id': 0, 'outageId': 1, 'alarmId': 1, 'alarmType': 1, 'alarmState': 1, 'clients': 1, 'TypeNetworkElement': '$networkElement.type', 'networkElementId': 1, 'timeResolution': 1, 'sourceSystemId': 1, 'origenId': 1, 'inicioOUM': '$omArrivalTimestamp', 'alarmRaisedTime': 1, 'alarmClearedTime': 1, 'alarmReportingTime': 1, 'sequence': 1, 'timeDifference': 1, 'timeDifferenceNumeric': 1, 'timeDifferenceIncident': 1, 'timeDifferenceNumericIncident': 1}}]
2024-11-22 19:19:24,204 - INFO - Se encontraron 0 alarmas en la página 1.
