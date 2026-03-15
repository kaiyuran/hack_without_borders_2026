import csv

def read_csv(filepath: str) -> list:
    rows = []
    with open(filepath, newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        for row in reader:
            try:
                row[-1] = int(row[-1])
            except:
                pass
            rows.append(row)
    return rows

# print(read_csv('testData.csv'))