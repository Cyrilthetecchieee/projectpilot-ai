import re

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

target_save_db = """        data = {
            "requirements_store": {k: v.model_dump() for k, v in requirements_store.items()},
            "architecture_store": {k: v.model_dump() for k, v in architecture_store.items()},
            "review_store": {k: v.model_dump() for k, v in review_store.items()}
        }"""
replacement_save_db = """        data = {
            "requirements_store": {k: v.model_dump() for k, v in requirements_store.items()},
            "architecture_store": {k: v.model_dump() for k, v in architecture_store.items()},
            "review_store": {k: v.model_dump() for k, v in review_store.items()},
            "test_store": {k: v.model_dump() for k, v in test_store.items()}
        }"""

content = content.replace(target_save_db, replacement_save_db)

target_load_db = """        if "review_store" in data:
            for k, v in data["review_store"].items():
                review_store[k] = ReviewResponse(**v)"""
replacement_load_db = """        if "review_store" in data:
            for k, v in data["review_store"].items():
                review_store[k] = ReviewResponse(**v)
        if "test_store" in data:
            for k, v in data["test_store"].items():
                test_store[k] = TestResponse(**v)"""

content = content.replace(target_load_db, replacement_load_db)

content = content.replace("_save_db() # Wait, need to save to db if I added it to db, but plan is not saved. So no _save_db for now.", "_save_db()")

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

