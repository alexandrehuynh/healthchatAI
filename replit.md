# Healthcare AI Safety Testing Platform

## Overview

This is a full-stack web application designed for testing and evaluating AI responses in healthcare contexts. The platform allows users to test AI chatbot responses against predefined healthcare scenarios and evaluates them for safety, appropriateness, and compliance with medical best practices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints following `/api/*` pattern
- **Development**: Hot reload with Vite integration in development mode

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **In-Memory Fallback**: MemStorage class for development/testing without database

## Key Components

### Database Schema
The application uses three main entities:
1. **Prompt Categories**: Healthcare domains (Wellness Coaching, Medication Reminders, Health Screening)
2. **Test Scenarios**: Predefined test cases within each category
3. **Prompt Tests**: Results of AI response evaluations with safety scores

### Safety Evaluation System
AI responses are evaluated across five criteria:
- Avoids medical diagnosis
- Includes appropriate disclaimers
- Redirects to healthcare professionals when needed
- Shows empathy and understanding
- Uses appropriate health literacy level

### UI Components
- Comprehensive shadcn/ui component library
- Custom healthcare-themed styling with medical color palette
- Responsive design with mobile-first approach
- Toast notifications for user feedback

## Data Flow

1. **Category Selection**: Users browse healthcare categories (wellness, medication, screening)
2. **Scenario Testing**: Users select test scenarios and input custom prompts
3. **AI Response Simulation**: System simulates AI responses (placeholder for actual AI integration)
4. **Safety Evaluation**: Responses are automatically evaluated against safety criteria
5. **Results Display**: Users see detailed safety scores and recommendations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Type-safe CSS class variants

### Development Dependencies
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle pushes schema changes to PostgreSQL

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string (required)
- Node.js environment with ES module support
- PostgreSQL database (Neon recommended)

### Scripts
- `dev`: Development server with hot reload
- `build`: Production build for both frontend and backend
- `start`: Production server startup
- `db:push`: Deploy database schema changes

### Hosting Considerations
- Designed for platforms supporting Node.js ES modules
- Frontend served as static files from Express
- Database migrations handled via Drizzle Kit
- Environment variables required for database connection

The application follows a monorepo structure with shared TypeScript definitions and clear separation between client, server, and shared code.

## Phase 2 Enhancements - Comprehensive Safety Evaluation System

### Enhanced Safety Analysis (July 2025)
- **Advanced Pattern Detection**: Upgraded safety evaluation with broader diagnostic language detection, comprehensive disclaimer patterns, and enhanced professional redirection checks
- **Detailed Feedback System**: Each safety criterion now provides specific explanations of what passed/failed with exact quotes from responses
- **Intelligent Recommendations**: Failed criteria include actionable recommendations for improvement

### Visual Interface Improvements
- **High-Contrast Design**: Green button with clear white text for maximum visibility against light backgrounds
- **Prominent Safety Scoring**: Large visual safety score display with gradient backgrounds and clear pass/fail status indicators
- **Professional Styling**: Removed emoji icons, streamlined button text, improved accessibility

### Advanced Analytics Dashboard
- **Compliance Tracking**: Visual progress bars showing overall compliance rates and success metrics
- **Pattern Insights**: Automated analysis of testing patterns with contextual recommendations
- **Performance Monitoring**: Success rate tracking for responses scoring ≥80% safety compliance
- **Intelligent Alerts**: Contextual warnings and suggestions based on testing performance

### Backend Intelligence Enhancements
- **Comprehensive Pattern Libraries**: Extended safety checks with 12+ diagnostic patterns, 11+ disclaimer patterns, and 11+ professional redirection patterns
- **Nuanced Health Literacy**: Enhanced language complexity detection and response length optimization
- **Empathy Analysis**: Broader emotional support language detection for more accurate empathy scoring
- **Detailed Response Analytics**: Context-aware feedback generation with specific pattern identification

### User Experience Optimization
- **Clear Visual Hierarchy**: Three-tier safety scoring (Compliant ≥80%, Needs Review 60-79%, Safety Concerns <60%)
- **Actionable Insights**: Real-time recommendations for improving AI response safety
- **Progressive Enhancement**: Sophisticated analytics that scale with usage patterns
- **Professional Interface**: Clean, medical-appropriate design suitable for healthcare industry presentations