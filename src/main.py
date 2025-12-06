from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import main as main_router
from src.routers import auth as auth_router
from src.routers import barcode as barcode_router
from src.utils.barcode.parse_barcode import init_barcode, shutdown_barcode
from src.utils.barcode.product_waste_analyzer import init_product_waste_analyzer, shutdown_product_waste_analyzer
from src.utils.barcode.disposal_instructions import init_disposal_instructions, shutdown_disposal_instructions

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

@app.on_event("startup")
async def startup_event():
    from src.init_db import init_db
    await init_db()
    print("Database initialized")
    await init_barcode()
    print("Barcode parser initialized")
    await init_product_waste_analyzer()
    print("Product waste analyzer initialized")
    await init_disposal_instructions()
    print("Disposal instructions generator initialized")
    print("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    print("Application shutting down")
    await shutdown_barcode()
    print("Barcode parser shutdown")
    await shutdown_product_waste_analyzer()
    print("Product waste analyzer shutdown")
    await shutdown_disposal_instructions()
    print("Disposal instructions generator shutdown")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

