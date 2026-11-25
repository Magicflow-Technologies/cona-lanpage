import zipfile
import os

files = ['package.json', 'package-lock.json', 'ecosystem.config.js', '.env', '.env.production', 'README_DEPLOY.txt']
dirs = ['dist', 'frontend']

with zipfile.ZipFile('cona-version3-deploy.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        if os.path.exists(f):
            z.write(f, f)
            print(f"Added file: {f}")
    for d in dirs:
        for root, _, filenames in os.walk(d):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                archive_name = full_path.replace("\\", "/")
                z.write(full_path, archive_name)

print("cona-version3-deploy.zip generado con éxito!")
