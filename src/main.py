from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from src.routers import main as main_router
from src.routers import auth as auth_router
from src.routers import barcode as barcode_router
from src.routers import image as image_router
from src.routers import voice_agent as voice_agent_router
from src.utils.barcode.parse_barcode import init_barcode, shutdown_barcode
from src.utils.api import init_openai_client, shutdown_openai_client, init_rate_limiter

app = FastAPI(
    title="FastAPI Application",
    description="FastAPI application with PostgreSQL and JWT authentication",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(main_router.router)
app.include_router(barcode_router.router)
app.include_router(image_router.router)
app.include_router(voice_agent_router.router)

@app.on_event("startup")
async def startup_event():
    from src.init_db import init_db
    await init_db()
    print("Database initialized")
    
    # Инициализация rate limiter (10 запросов в секунду на IP)
    init_rate_limiter(max_requests=10, window_seconds=1.0)
    print("Rate limiter initialized")
    
    # Инициализация OpenAI клиента (используется всеми LLM сервисами)
    await init_openai_client()
    print("OpenAI client initialized")
    
    await init_barcode()
    print("Barcode parser initialized")
    
    print("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    print("Application shutting down")
    
    await shutdown_barcode()
    print("Barcode parser shutdown")
    
    await shutdown_openai_client()
    print("OpenAI client shutdown")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
