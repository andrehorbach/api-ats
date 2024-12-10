import pandas as pd
import requests
import time
import base64
from multiprocessing.pool import ThreadPool
from datetime import datetime

def obter_notas_opportunity(opportunity_id, max_retries=3):
    url = f'https://api.lever.co/v1/opportunities/{opportunity_id}/notes'
    
    # Your API token
    api_token = 'gL4hxImKrfNXcfWjLq57snq/Fq8Jd/8x4XxzukPvI1Af9C8i'

    # Encode the token as base64
    token_base64 = base64.b64encode(api_token.encode('utf-8')).decode('utf-8')
    print(f'Starting up with token {api_token}...')
    # Replace 'seu_token_aqui' with Basic Authentication
    headers = {
        'Authorization': f'Basic {token_base64}',
    }

    retries = 0
    while retries < max_retries:
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                print(f'Retrieving notes for opportunity {opportunity_id}...')
                notas = response.json()
                return notas
            else:
                print(f'Error getting notes for opportunity {opportunity_id}. Status code: {response.status_code}')
                return None
        except requests.exceptions.RequestException as e:
            print(f'Error occurred during request: {e}')
            retries += 1
            if retries < max_retries:
                print(f'Retrying... (Attempt {retries})')
                time.sleep(2 ** retries)  # Exponential backoff for retries
            else:
                print('Max retries exceeded. Exiting...')
                return None

# Read opportunity IDs from a text file without commas
txt_file_path = 'lever_opportunities.txt'
with open(txt_file_path, 'r') as file:
    opportunities = [line.strip() for line in file]

# Collect notes and store in a DataFrame
output_data = []
start_time = time.time()  # Record start time

# Counter variable
counter = 0

def fetch_notes(opportunity_id):
    global counter
    counter += 1
    notas = obter_notas_opportunity(opportunity_id)
    print(f'Note: {notas}')
    if notas and 'data' in notas:
        for note in notas['data']:
            for field in note['fields']:
                if field['createdAt']:
                    created_at = datetime.utcfromtimestamp(field['createdAt'] / 1000).strftime('%Y-%m-%d %H:%M:%S')
                    value = field['value']
                    output_data.append({'opportunity': opportunity_id, 'createdAt': created_at, 'value': value})
    print(f'Opportunity {counter}/{len(opportunities)} processed.')

# Use a ThreadPool to fetch notes concurrently
with ThreadPool(processes=8) as pool:  # You can adjust the number of processes for optimal performance
    pool.map(fetch_notes, opportunities)

end_time = time.time()  # Record end time

# Calculate requests per second
total_requests = len(opportunities)
total_time = end_time - start_time
requests_per_second = total_requests / total_time

print(f'Total requests: {total_requests}')
print(f'Total time taken: {total_time} seconds')
print(f'Requests per second: {requests_per_second}')

# Save data to a CSV file
df = pd.DataFrame(output_data)
df.to_csv('output_notes2.csv', index=False)
