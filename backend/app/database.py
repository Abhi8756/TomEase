from sqlalchemy import create_engine, Column, String, Float, DateTime, Integer, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from typing import List, Dict, Optional

Base = declarative_base()

class Prediction(Base):
    """Store all predictions for analytics and retraining"""
    __tablename__ = 'predictions'
    
    id = Column(Integer, primary_key=True)
    scan_id = Column(String(36), unique=True, index=True)
    user_id = Column(String(36), index=True, nullable=True)
    image_url = Column(String(255), nullable=True)
    disease = Column(String(50))
    confidence = Column(Float)
    confidence_calibrated = Column(Float)
    model_version = Column(String(50))
    is_reliable = Column(Boolean)
    warning = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_feedback = Column(String(20), nullable=True)  # correct/incorrect
    plot_id = Column(String(36), nullable=True, index=True)
    
class Plot(Base):
    """Store field/plot information for users"""
    __tablename__ = 'plots'
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), index=True) # The owner
    name = Column(String(255))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PlotMember(Base):
    """Store members of a plot"""
    __tablename__ = 'plot_members'
    
    id = Column(Integer, primary_key=True)
    plot_id = Column(String(36), index=True)
    user_id = Column(String(36), index=True)
    role = Column(String(50), default="member")
    created_at = Column(DateTime, default=datetime.utcnow)

class ModelVersion(Base):
    """Track model versions"""
    __tablename__ = 'model_versions'
    
    id = Column(Integer, primary_key=True)
    version = Column(String(50), unique=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    accuracy_field = Column(Float)
    r2_path = Column(String(255))
    is_active = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

class User(Base):
    """Store users for authentication"""
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    password_hash = Column(String(255))
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

class Database:
    """Database connection manager"""
    
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self._connected = False
    
    async def connect(self):
        """Initialize database connection"""
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("[WARN] No DATABASE_URL - using SQLite")
            database_url = "sqlite:///./tomato_disease.db"
        
        # Fix for Render PostgreSQL URL (they use postgres:// but SQLAlchemy needs postgresql://)
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Create tables
        Base.metadata.create_all(self.engine)
        
        self._connected = True
        print("[OK] Database connected")
    
    async def disconnect(self):
        """Close database connection"""
        if self.engine:
            self.engine.dispose()
        self._connected = False
    
    def is_connected(self) -> bool:
        return self._connected
    
    async def save_prediction(
        self,
        scan_id: str,
        disease: str,
        confidence: float,
        confidence_calibrated: float,
        model_version: str,
        plot_id: str = None,
        user_id: str = None,
        image_url: str = None
    ) -> None:
        """Save prediction to database"""
        session = self.SessionLocal()
        try:
            pred = Prediction(
                scan_id=scan_id,
                disease=disease,
                confidence=confidence,
                confidence_calibrated=confidence_calibrated,
                model_version=model_version,
                is_reliable=confidence_calibrated >= 0.6,
                plot_id=plot_id,
                user_id=user_id,
                image_url=image_url
            )
            session.add(pred)
            session.commit()
        finally:
            session.close()
    
    async def get_total_scans(self) -> int:
        """Get total number of scans"""
        session = self.SessionLocal()
        try:
            return session.query(Prediction).count()
        finally:
            session.close()
    
    async def get_recent_scans(self, limit: int = 50) -> List[Dict]:
        """Get recent predictions for analytics"""
        session = self.SessionLocal()
        try:
            preds = session.query(Prediction)\
                .order_by(Prediction.timestamp.desc())\
                .limit(limit)\
                .all()
            
            return [
                {
                    "scan_id": p.scan_id,
                    "disease": p.disease,
                    "confidence": p.confidence,
                    "is_reliable": p.is_reliable,
                    "timestamp": p.timestamp.isoformat(),
                    "image_url": p.image_url
                }
                for p in preds
            ]
        finally:
            session.close()
    
    async def save_model_version(
        self,
        version: str,
        accuracy_field: float,
        r2_path: str,
        notes: str = None
    ):
        """Save new model version"""
        session = self.SessionLocal()
        try:
            # Deactivate all previous versions
            session.query(ModelVersion).update({ModelVersion.is_active: False})
            
            # Add new version
            model = ModelVersion(
                version=version,
                accuracy_field=accuracy_field,
                r2_path=r2_path,
                is_active=True,
                notes=notes
            )
            session.add(model)
            session.commit()
        finally:
            session.close()
    
    async def get_active_model_version(self) -> Dict:
        """Get currently active model version"""
        session = self.SessionLocal()
        try:
            model = session.query(ModelVersion)\
                .filter(ModelVersion.is_active == True)\
                .first()
            
            if model:
                return {
                    'version': model.version,
                    'uploaded_at': model.uploaded_at.isoformat(),
                    'accuracy_field': model.accuracy_field,
                    'r2_path': model.r2_path
                }
            return None
        finally:
            session.close()

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get a user by their email address"""
        session = self.SessionLocal()
        try:
            user = session.query(User).filter(User.email == email).first()
            if not user:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "password_hash": user.password_hash,
                "role": user.role,
                "created_at": user.created_at.isoformat()
            }
        finally:
            session.close()

    async def create_user(self, user_id: str, email: str, name: str, password_hash: str, role: str) -> None:
        """Create a new user"""
        session = self.SessionLocal()
        try:
            new_user = User(
                id=user_id,
                email=email,
                name=name,
                password_hash=password_hash,
                role=role
            )
            session.add(new_user)
            session.commit()
        finally:
            session.close()

    async def get_total_users(self) -> int:
        """Get total number of users"""
        session = self.SessionLocal()
        try:
            return session.query(User).count()
        finally:
            session.close()

    async def create_plot(self, plot_id: str, user_id: str, name: str, latitude: float = None, longitude: float = None) -> None:
        """Create a new plot/field"""
        session = self.SessionLocal()
        try:
            plot = Plot(
                id=plot_id,
                user_id=user_id,
                name=name,
                latitude=latitude,
                longitude=longitude
            )
            session.add(plot)
            session.commit()
        finally:
            session.close()

    async def get_user_plots(self, user_id: str) -> List[Dict]:
        """Get all plots for a specific user (owned and shared)"""
        session = self.SessionLocal()
        try:
            # Plots where user is owner
            owned = session.query(Plot).filter(Plot.user_id == user_id).all()
            
            # Plots where user is a member
            member_links = session.query(PlotMember).filter(PlotMember.user_id == user_id).all()
            member_plot_ids = [m.plot_id for m in member_links]
            shared = session.query(Plot).filter(Plot.id.in_(member_plot_ids)).all()
            
            # Combine and deduplicate
            all_plots = {p.id: p for p in (owned + shared)}
            plots = list(all_plots.values())
            plots.sort(key=lambda x: x.created_at, reverse=True)
            
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "created_at": p.created_at.isoformat(),
                    "role": "owner" if p.user_id == user_id else "member"
                }
                for p in plots
            ]
        finally:
            session.close()

    async def get_plot_by_id(self, plot_id: str, user_id: str) -> Optional[Dict]:
        """Get a single plot by ID if user has access"""
        session = self.SessionLocal()
        try:
            plot = session.query(Plot).filter(Plot.id == plot_id).first()
            if not plot:
                return None
            
            # Check access
            if plot.user_id != user_id:
                member = session.query(PlotMember).filter(PlotMember.plot_id == plot_id, PlotMember.user_id == user_id).first()
                if not member:
                    return None
            
            return {
                "id": plot.id,
                "name": plot.name,
                "latitude": plot.latitude,
                "longitude": plot.longitude,
                "created_at": plot.created_at.isoformat(),
                "role": "owner" if plot.user_id == user_id else "member",
                "owner_id": plot.user_id
            }
        finally:
            session.close()

    async def get_scans_by_plot(self, plot_id: str, user_id: str) -> List[Dict]:
        """Get all scans for a specific plot if user has access"""
        session = self.SessionLocal()
        try:
            # Reuse get_plot_by_id logic for access check
            plot = session.query(Plot).filter(Plot.id == plot_id).first()
            if not plot:
                return []
            if plot.user_id != user_id:
                member = session.query(PlotMember).filter(PlotMember.plot_id == plot_id, PlotMember.user_id == user_id).first()
                if not member:
                    return []
            
            scans = session.query(Prediction).filter(Prediction.plot_id == plot_id).order_by(Prediction.timestamp.desc()).all()
            return [
                {
                    "scan_id": p.scan_id,
                    "disease": p.disease,
                    "confidence": p.confidence,
                    "timestamp": p.timestamp,
                    "is_reliable": p.is_reliable,
                    "image_url": p.image_url
                }
                for p in scans
            ]
        finally:
            session.close()
            
    async def add_plot_member(self, plot_id: str, user_id: str, role: str = "member") -> bool:
        """Add a user to a plot"""
        session = self.SessionLocal()
        try:
            # Check if already a member
            existing = session.query(PlotMember).filter(PlotMember.plot_id == plot_id, PlotMember.user_id == user_id).first()
            if existing:
                return False
                
            member = PlotMember(plot_id=plot_id, user_id=user_id, role=role)
            session.add(member)
            session.commit()
            return True
        finally:
            session.close()
            
    async def get_plot_members(self, plot_id: str) -> List[Dict]:
        """Get all members of a plot including the owner"""
        session = self.SessionLocal()
        try:
            plot = session.query(Plot).filter(Plot.id == plot_id).first()
            if not plot:
                return []
                
            owner = session.query(User).filter(User.id == plot.user_id).first()
            members = session.query(PlotMember, User).join(User, PlotMember.user_id == User.id).filter(PlotMember.plot_id == plot_id).all()
            
            result = []
            if owner:
                result.append({
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email,
                    "role": "owner"
                })
                
            for member_link, user in members:
                result.append({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": member_link.role
                })
                
            return result
        finally:
            session.close()

database = Database()
