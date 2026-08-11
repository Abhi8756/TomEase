# TomEase Interview Deep Dive

This document is the single detailed reference for how TomEase works, what each important file does, why the stack was chosen, and how IceCloud deployment differs from cloud platforms like AWS.

## 1. What TomEase Is

TomEase is a tomato leaf disease detection platform with three connected parts:

1. A FastAPI backend that performs disease inference, GradCAM generation, authentication, plot management, and community features.
2. A React Native mobile app that captures leaf images, sends them to the backend, and presents predictions, history, plots, and community features.
3. A React + Vite web app that provides a browser-based dashboard for scanning, history, plots, admin model management, and user interaction.

The backend is centered around a trained ResNet50 model checkpoint named CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth. The system is designed for practical agricultural use, not just offline model scoring.

## 2. End-to-End Flow

The data flow is:

1. User opens the mobile app or web app.
2. User signs in and receives JWT tokens.
3. User captures or uploads a tomato leaf image.
4. Frontend sends the image to POST /predict on the FastAPI backend.
5. Backend preprocesses the image, runs the PyTorch model, generates calibrated probabilities, creates a GradCAM heatmap, and determines reliability.
6. Backend uploads the original image and GradCAM image to local storage or object storage depending on deployment.
7. Backend saves scan metadata to the database.
8. Frontend displays the diagnosis, confidence, heatmap, recommendations, and scan history.
9. If the scan is attached to a plot, backend can trigger nearby plot alerts based on location.

This is why the project is not just a model file. It is an end-to-end application with inference, explanation, persistence, authentication, and UX layers.

## 3. Repository Map

### Root files

- README.md: Lightweight project summary and quick introduction.
- INTERVIEW_DEEP_DIVE.md: This document, the detailed interview reference.
- Dockerfile.standalone: Full-stack container build that serves the backend and web frontend together.
- nginx.standalone.conf: Nginx reverse proxy and static file server config for the standalone image.
- supervisord.standalone.conf: Runs Nginx and Uvicorn together inside one container.
- CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth: The trained PyTorch checkpoint used for inference.
- upload_model.sh / upload_model.bat: Convenience scripts for uploading the model.

### backend/

- app/main.py: FastAPI application entrypoint and API routes.
- app/models.py: Model loading, preprocessing, inference, GradCAM, and calibration.
- app/database.py: SQLAlchemy models and persistence operations.
- app/storage.py: Local storage abstraction for images, GradCAM, and models.
- app/auth.py: JWT authentication and user registration/login.
- app/plots.py: Plot creation, plot details, and NDVI lookup.
- app/community.py: Community posts, comments, and upvotes.
- app/utils.py: Recommendations, scan augmentation, distance math.
- requirements.txt: Python dependencies used by the backend.
- render.yaml: Legacy Render deployment config that shows the original cloud assumption.

### mobile/

- App.tsx: App bootstrap, navigation, and auth gating.
- src/store.ts: Global client state.
- src/services/api.ts: Mobile API client and endpoint wrappers.
- src/services/database.ts: Local persistence layer.
- src/services/utils.ts: Shared mobile helpers.
- src/screens/CameraScreen.tsx: Image capture flow.
- src/screens/ResultScreen.tsx: Prediction display and GradCAM rendering.
- src/screens/HistoryScreen.tsx: Scan history and review.
- src/screens/LoginScreen.tsx: Login UI.
- src/screens/RegisterScreen.tsx: Registration UI.
- src/screens/CommunityScreen.tsx: Community feed.
- src/screens/PlotsScreen.tsx: Plot list and plot actions.

### website/

- src/main.tsx: React DOM bootstrap.
- src/App.tsx: Route definitions and auth/admin guards.
- src/App.css: App-level styles.
- src/index.css: Global styling and Tailwind base.
- src/components/layout/Navbar.tsx: Main navigation shell.
- src/pages/LandingPage.tsx: Public landing page.
- src/pages/AuthPage.tsx: Login and registration page.
- src/pages/DashboardPage.tsx: Main dashboard.
- src/pages/ScanPage.tsx: Browser-based image scan flow.
- src/pages/ResultPage.tsx: Scan result view.
- src/pages/HistoryPage.tsx: History and past scans.
- src/pages/AdminPage.tsx: Admin model upload and management.
- src/pages/PlotsPage.tsx: Plot management overview.
- src/pages/PlotDetailsPage.tsx: Individual plot view and related scans.
- src/pages/CommunityPage.tsx: Community forum.
- src/services/api.ts: Web API client and resource wrappers.
- src/store/index.ts: Web state management.

### model/

- export_model.py: Exports a trained checkpoint into a production-ready artifact.
- export_model_simple.py: Simpler export helper variant.

### docs/

The old docs folder contained deployment and architecture notes, but those are now consolidated here.

## 4. Backend Architecture in Detail

### 4.1 app/main.py

This is the central FastAPI application.

What it does:

- Creates the FastAPI app object.
- Enables CORS so mobile and web clients can call it.
- Mounts static storage so saved images and GradCAM files can be served.
- Loads the model on startup.
- Connects the database on startup and disconnects on shutdown.
- Registers routers for auth, plots, and community features.
- Exposes the core routes: /, /health, /predict, /model/info, and /admin/upload-model.

Why it matters:

- This file is the orchestration layer. It does not implement the model itself, but it controls request flow, lifecycle, and response shaping.

Key behavior:

- /predict validates image type, reads bytes, runs inference, computes reliability, uploads the GradCAM and original image, stores prediction metadata, and optionally triggers regional alerts.
- /admin/upload-model allows an admin to upload a new checkpoint, validate it, store it, and hot-swap the in-memory model.
- /health reports readiness, model state, and database connectivity.

### 4.2 app/models.py

This is the ML brain of the backend.

What it contains:

- ResNet50TomatoModel: A custom wrapper around torchvision ResNet50 that matches the checkpoint structure.
- ModelService: The service object that loads checkpoints, preprocesses images, runs inference, calibrates confidence, generates GradCAM, and checks prediction reliability.

Why this structure exists:

- The checkpoint was trained with a very specific architecture. The wrapper preserves compatibility with saved keys.
- ResNet50 is used because it is a strong transfer-learning backbone for image classification and is proven on visual recognition tasks.
- GradCAM uses the final convolutional layer to explain predictions without needing a second localization model.

Important details:

- Preprocessing is simple: resize to 224x224 and normalize with ImageNet statistics.
- The model supports multiple checkpoint formats: model_state_dict, state_dict, model, net, or raw state dict.
- Calibration uses temperature scaling so confidence is less overconfident than raw softmax.
- Reliability checks can reject low-confidence or ambiguous scans.
- The class list is fixed to six classes: Early_Blight, Healthy, Late_Blight, Leaf_Mold, Septoria, and TYLCV.

### 4.3 app/database.py

This file owns persistence.

What it stores:

- Prediction records, including scan ID, disease, confidence, calibrated confidence, model version, reliability, warning, timestamp, plot ID, user ID, and image URL.
- Plots and plot members.
- Alerts.
- Community posts, comments, and upvotes.
- Model versions.
- Users.

Why SQLAlchemy:

- It gives a single Python ORM for the project data model.
- It keeps the code portable between SQLite and PostgreSQL.
- It is a good fit for structured relational data like scans, users, plots, and alerts.

Why this is better than a document database here:

- The data has strong relationships.
- Users own plots, plots have members, scans belong to plots, alerts belong to users, and model versions are versioned records.
- Relational integrity is the natural fit.

### 4.4 app/storage.py

This is the storage abstraction.

What it does:

- Saves GradCAM images.
- Saves original uploaded leaf images.
- Saves model checkpoints.
- Lists stored model versions.

Why it exists:

- The backend should not care whether files live on local disk, an object store, or an attached volume.
- In IceCloud, local volume-backed storage is the practical fallback.
- In cloud-first deployments, this layer could be redirected to R2 or another object store.

### 4.5 app/auth.py

This file handles authentication.

What it does:

- Registers users.
- Logs users in.
- Issues access and refresh tokens.
- Validates the current user from a bearer token.
- Returns the user profile from /auth/me.

Why JWT:

- It works well for mobile and web clients.
- It avoids server-side session storage.
- It is simple to attach in Authorization headers.

Why bcrypt:

- Password hashing must not be reversible.
- bcrypt is a standard, battle-tested choice for password storage.

Notable behavior:

- The first registered user becomes admin.
- If bcrypt or python-jose is unavailable, the code includes a dev fallback, but production should always use the secure path.

### 4.6 app/plots.py

This file supports field-level tracking.

What it does:

- Creates plots with optional latitude and longitude.
- Lists the current user’s plots.
- Returns plot details and scans tied to a plot.
- Generates a rough GeoJSON polygon for a plot.
- Tries to fetch NDVI imagery from an external agromonitoring API.
- Lets plot owners invite members.

Why this matters:

- The product is not only for single-image scanning.
- It supports field-level monitoring, geographic context, and collaboration.

### 4.7 app/community.py

This file adds social and knowledge-sharing features.

What it does:

- Lists community posts.
- Creates a post.
- Toggles upvotes.
- Lists comments.
- Adds comments.

Why include it:

- Farmers and agronomists often need to compare observations and share advice.
- Community feedback makes the app more useful than a one-way classifier.

### 4.8 app/utils.py

This is the shared logic helper file.

What it does:

- Returns treatment recommendations for each disease.
- Augments scan records with GradCAM URLs, severity, and recommendations.
- Calculates distance between GPS coordinates using the Haversine formula.

Why this file is important:

- It centralizes logic that the API, plots, and history views all need.
- It keeps presentation-friendly data shaping out of route handlers.

## 5. Mobile App Architecture

### 5.1 App.tsx

This is the mobile app bootstrap.

What it does:

- Sets up navigation.
- Restores the access token from SecureStore.
- Fetches the current user profile.
- Switches between auth screens and main app tabs.

Why Expo and React Native:

- One codebase targets iOS and Android.
- Expo accelerates camera, storage, and build tooling.
- It is a better fit than writing separate Swift and Kotlin apps for this project scope.

### 5.2 src/services/api.ts

This file centralizes the backend API client.

What it does:

- Sets the API base URL.
- Adds the bearer token automatically.
- Logs the user out on 401 responses.
- Provides a predictDisease helper.
- Provides getModelInfo and checkHealth helpers.

Why this is good design:

- UI screens do not need to know HTTP details.
- Token handling stays in one place.
- It makes the app easier to maintain and test.

### 5.3 src/screens/*

CameraScreen.tsx:

- Captures leaf photos or selects images.
- Sends them to the backend for classification.

ResultScreen.tsx:

- Displays disease, confidence, calibrated confidence, recommendations, and GradCAM.

HistoryScreen.tsx:

- Lets the user review past scans and trends.

LoginScreen.tsx and RegisterScreen.tsx:

- Handle user authentication flows.

CommunityScreen.tsx:

- Shows community content and interaction.

PlotsScreen.tsx:

- Shows plots and related field data.

### 5.4 Mobile storage and utilities

- src/store.ts keeps app state such as auth and user info.
- src/services/database.ts keeps local scan history or offline data.
- src/services/utils.ts contains shared helper logic.

Why mobile uses local storage and SQLite:

- Users may have poor connectivity in the field.
- Past scans should still be available offline.
- Local persistence improves reliability and perceived speed.

## 6. Web App Architecture

### 6.1 src/App.tsx

This is the routing and access-control center for the website.

What it does:

- Creates public and protected routes.
- Blocks access unless the user is authenticated.
- Blocks admin-only views unless the user is admin.
- Wraps app screens in a common layout.

Why React Router:

- The web app behaves like an SPA dashboard.
- Route-based UX is cleaner for dashboard, scan, result, and admin flows.

### 6.2 src/components/layout/Navbar.tsx

This is the shared top-level navigation.

Why it exists:

- Keeps page chrome consistent.
- Reduces repeated UI code across pages.

### 6.3 src/pages/*

LandingPage.tsx:

- Public-facing introduction to the platform.

AuthPage.tsx:

- Login and registration entry point.

DashboardPage.tsx:

- Main authenticated overview.

ScanPage.tsx:

- Browser-based scan input and submission flow.

ResultPage.tsx:

- Displays scan output in the web app.

HistoryPage.tsx:

- Shows historical scan records.

AdminPage.tsx:

- Handles model upload and admin operations.

PlotsPage.tsx and PlotDetailsPage.tsx:

- Manage plot overview and per-plot detail views.

CommunityPage.tsx:

- Web forum and discussion UI.

### 6.4 src/services/api.ts

This is the web API wrapper.

What it does:

- Injects auth tokens from localStorage.
- Refreshes access tokens on 401.
- Wraps auth, prediction, analytics, plots, community, and model endpoints.

Why web and mobile have different API clients:

- Web stores tokens in localStorage.
- Mobile stores tokens in SecureStore.
- The runtime and security characteristics are different, so the API layer is adapted per platform.

## 7. Model and ML Design Choices

### Why ResNet50

ResNet50 is used because:

- It is strong for image classification.
- It is well supported in torchvision.
- It is easier to load and deploy than custom architectures.
- It gives a stable feature map for GradCAM.

Why not a smaller plain CNN:

- A smaller CNN usually performs worse on complex agricultural images.
- It is less robust to lighting, background clutter, and leaf variation.

### Why not YOLO for this project

YOLO is good when object localization is required, but here the model already predicts from whole-leaf images and GradCAM provides explanation.

Why not use YOLO plus classifier:

- It adds complexity.
- It creates a multi-stage pipeline with more failure points.
- The trained model already handles field imagery well enough to avoid separate leaf detection.

### Why PyTorch

PyTorch is used because:

- The checkpoint is already a PyTorch artifact.
- torchvision provides the ResNet50 backbone.
- GradCAM implementation is straightforward.
- Research-to-production transition is easier.

Why not TensorFlow here:

- The model, export scripts, and inference code are already centered on PyTorch.
- Switching frameworks would add unnecessary migration cost.

### Why calibration and reliability checks matter

The backend does not blindly trust raw softmax output. It computes calibrated confidence and checks reliability because a classifier can be confidently wrong on blurry or non-leaf images.

This is important in agriculture because users need a trustworthy indication, not just a label.

## 8. Database Design Choices

### Why PostgreSQL

PostgreSQL is a strong fit because TomEase has relational data:

- users
- plots
- plot membership
- scan history
- alerts
- community posts and comments
- model versions

Why not MongoDB here:

- The app’s entities have clear relational links.
- SQL queries are natural for analytics and history.
- Foreign-key style thinking fits this domain better.

### Why SQLite is still mentioned

SQLite is used as a local or fallback store in development and offline scenarios.

Why this hybrid matters:

- Local development is easy.
- Offline-first mobile behavior is possible.
- Production deployment can still use PostgreSQL for shared persistence.

## 9. Frontend Technology Choices

### Mobile stack

- React Native: cross-platform native UI.
- Expo: fast iteration, camera, secure storage, location, and build tooling.
- Zustand: simple global state.
- Axios: clean HTTP client.
- Expo SecureStore: secure token storage.
- Expo SQLite: offline persistence.

Why not Flutter:

- The project already uses the React ecosystem.
- React Native pairs naturally with shared JavaScript/TypeScript patterns.

Why not fully native apps:

- Twice the implementation cost.
- Harder to keep feature parity between iOS and Android.

### Web stack

- React: component-driven SPA.
- TypeScript: safer code and better refactoring.
- Vite: fast dev server and build pipeline.
- Tailwind CSS: utility-first styling.
- React Router: route management.
- Framer Motion: animation.
- Leaflet and React Leaflet: map visualization.
- React Hot Toast: lightweight notifications.

Why not Next.js:

- This is primarily an authenticated client app, not a server-rendered content site.
- Vite keeps the build simple and fast.

## 10. Deployment and Containerization

### Dockerfile.standalone

This file builds a single container that includes:

- the React web build
- the Python backend
- Nginx for serving the frontend and proxying API requests
- Supervisor to run Nginx and Uvicorn together

Why this exists:

- It gives one deployable artifact for a platform like IceCloud.
- It is convenient when the target platform expects a Docker image.

### nginx.standalone.conf

This file routes:

- /api/ to the FastAPI backend
- / to the static web frontend

Why Nginx is used:

- It efficiently serves static assets.
- It cleanly separates frontend and backend traffic inside the same container.
- It handles the SPA fallback for React routes.

### supervisord.standalone.conf

This file starts both Nginx and Uvicorn in the same container.

Why Supervisor is used:

- One process manager makes the container simpler.
- If either Nginx or Uvicorn stops, Supervisor can restart it.

### backend/render.yaml

This is a legacy Render deployment manifest.

Why it still matters conceptually:

- It shows the original cloud target and the prior assumption of $PORT-based startup.
- It is useful for understanding the project’s evolution, but not the current IceCloud focus.

## 11. IceCloud in Extreme Detail

### What IceCloud Is

IceCloud is being used here as a Docker-based container hosting platform. The important mental model is:

1. You build a Docker image locally or in CI.
2. You push that image to a registry.
3. IceCloud pulls the image.
4. IceCloud runs the container.
5. You configure environment variables and exposed ports in the dashboard.

In this project, IceCloud is not acting like a framework-specific hosting platform. It is acting like a container runtime with a dashboard.

### How TomEase uses IceCloud

TomEase uses IceCloud for the backend and, in the standalone configuration, the web frontend too.

The important deployment assumptions are:

- The backend listens on a fixed internal port, typically 8000.
- Nginx listens on port 80 in the standalone container.
- API traffic is proxied through /api.
- Static web assets are served directly by Nginx.
- Model files and uploaded images need persistent or semi-persistent storage outside the container filesystem when possible.

### IceCloud deployment flow for this repo

1. Build a Docker image from Dockerfile.standalone or the backend Dockerfile depending on whether you want full-stack or backend-only deployment.
2. Push the image to a registry such as Docker Hub or GHCR.
3. Create a container service in IceCloud.
4. Point IceCloud to the image.
5. Set the container port:
   - 80 for the standalone full-stack image.
   - 8000 for backend-only deployment.
6. Add environment variables such as DATABASE_URL, ADMIN_API_KEY, R2 credentials, and any storage path variables.
7. Deploy and wait for the service to become healthy.
8. Test /health and /docs or the web dashboard route.

### Why IceCloud is attractive for TomEase

- It matches the container-first packaging already present in the repo.
- It avoids having to rewrite the app for a platform-specific deployment model.
- It is easier to explain in an interview because the container boundary is clear.
- It works well for a project that has a backend API plus a frontend build.

### What IceCloud is doing under the hood

The runtime responsibilities are:

- start the container
- expose the configured port
- keep the process alive
- apply the environment variables
- provide logs and restart behavior
- route public traffic to the container endpoint

That is enough for TomEase because the app is already packaged to run in a standard Linux container.

### IceCloud versus AWS

AWS is a very broad cloud platform with many distinct services. IceCloud is a much narrower container hosting experience.

#### 1. Deployment model

- IceCloud: push a container, set env vars, expose a port.
- AWS: choose from ECS, EKS, App Runner, Elastic Beanstalk, EC2, Lambda, Fargate, ALB, RDS, S3, CloudFront, Secrets Manager, and more.

Why that matters:

- IceCloud is simpler when the application already fits inside one Docker image.
- AWS is more powerful, but the operational choices are much larger.

#### 2. Operational complexity

- IceCloud: lower configuration surface.
- AWS: more networking, IAM, account structure, service coupling, and pricing decisions.

For TomEase:

- AWS would be overkill if the goal is simply to run the app reliably behind a container endpoint.
- The project does not need the full AWS ecosystem unless you want enterprise-scale integration.

#### 3. Cost and learning overhead

- IceCloud: easier to reason about for a container deployment.
- AWS: more control, but more cost management and more architecture choices.

For an interview answer, the correct framing is:

- IceCloud is better for a direct Docker deployment path.
- AWS is better when you need a larger managed cloud ecosystem, advanced scaling, strict IAM, multi-service orchestration, or enterprise network controls.

#### 4. Storage and database services

- IceCloud in this project relies on external services or local volume-backed storage.
- AWS would commonly use S3, RDS, CloudWatch, Secrets Manager, and possibly ECS or EKS.

For TomEase:

- The code already uses a database abstraction and local storage fallback.
- That makes IceCloud deployment straightforward.

#### 5. Best-fit use case

Use IceCloud when:

- you have a containerized app
- you want fast deployment with minimal platform complexity
- you do not need a large cloud architecture

Use AWS when:

- you need enterprise-grade infrastructure
- you need multi-region or multi-service architecture
- you need tight integration with many managed cloud services

### IceCloud versus Render, Railway, and Fly.io

- Render: Git-based deployment and managed services, but the repo already moved toward container-centric deployment.
- Railway: developer-friendly container deployment, but usually still a broader platform choice than needed here.
- Fly.io: powerful edge deployment, but it adds another operational model.
- IceCloud: straightforward container hosting, which aligns with the standalone Docker approach in this repo.

## 12. Why Not Other Tech Stacks

### Why not Django

- FastAPI is lightweight and async-friendly.
- It is a better fit for a prediction API and modern type-annotated request/response design.
- Django would be heavier than needed for this service-centric app.

### Why not Flask

- Flask is flexible but more manual.
- FastAPI gives validation, docs, and async support out of the box.

### Why not TensorFlow

- The trained checkpoint and inference code are already PyTorch-based.
- Changing frameworks would not add value and would risk incompatibility.

### Why not a serverless-only architecture

- ML inference can be heavy and benefit from a long-lived model process.
- Cold starts and packaging large model files can be awkward in serverless flows.

### Why not pure AWS architecture

- The app does not need the operational breadth of AWS to be understandable or useful.
- A container-first deployment on IceCloud is enough for interview-friendly, practical deployment reasoning.

## 13. How to Explain the Project in an Interview

If asked to describe the system in one minute:

"TomEase is a tomato leaf disease detection platform with a FastAPI inference backend, a React Native mobile app, and a React web dashboard. Users upload leaf images, the backend runs a PyTorch ResNet50 model, calibrates confidence, generates GradCAM explanations, stores results in a relational database, and returns recommendations. The mobile app focuses on field capture and offline-friendly access, while the web app provides a browser dashboard for scanning, history, plots, and admin model management."

If asked why the architecture is good:

- It separates inference from presentation.
- It supports both mobile and web clients from one API.
- It explains predictions rather than acting as a black box.
- It is deployable as a Docker container on IceCloud.

If asked why IceCloud instead of AWS:

- IceCloud is the simpler fit for a containerized app.
- AWS is powerful but much heavier operationally.
- For this project, a container runtime plus external services is enough.

## 14. Interview Talking Points by File Group

- main.py: request orchestration, startup/shutdown, endpoints.
- models.py: PyTorch inference, GradCAM, calibration, reliability.
- database.py: relational persistence and analytics.
- storage.py: file storage abstraction.
- auth.py: JWT auth and role assignment.
- plots.py: geospatial plot features and NDVI integration.
- community.py: social engagement features.
- utils.py: recommendations and shared logic.
- mobile/App.tsx: auth bootstrap and navigation.
- mobile/src/services/api.ts: authenticated API access.
- website/src/App.tsx: routes and access control.
- website/src/services/api.ts: dashboard API integration.
- Dockerfile.standalone: one-image deployment.
- nginx.standalone.conf: frontend serving and API proxying.
- supervisord.standalone.conf: multi-process container startup.

## 15. Final Summary

The simplest accurate way to describe TomEase is:

- It is a full-stack tomato disease detection system.
- The backend is FastAPI and PyTorch.
- The mobile app is React Native with Expo.
- The web app is React + Vite + TypeScript.
- The data layer is relational and suits scans, users, plots, and alerts.
- The model is wrapped with calibration, GradCAM, and reliability checks.
- IceCloud is the deployment target because this project is already packaged for Docker.
- AWS would work, but it is broader and more complex than the current problem requires.
