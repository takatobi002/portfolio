from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="研究者ポートフォリオ")

# 静的ファイルの提供
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/", StaticFiles(directory="site", html=True), name="site") 