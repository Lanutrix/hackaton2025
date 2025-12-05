from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import main as main_router
from src.routers import auth as auth_router

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

@app.on_event("startup")
async def startup_event():
    from src.init_db import init_db
    await init_db()
    print("Database initialized")
    print("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    print("Application shutting down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

