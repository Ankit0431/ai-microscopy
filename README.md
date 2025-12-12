# AI Microscopy 🔬

> **Revolutionizing Blood Cell Analysis with Deep Learning**

An end-to-end AI-powered web platform for automated detection and classification of blood cells using advanced computer vision and deep learning technologies.

![AI Microscopy](https://img.shields.io/badge/AI-Microscopy-red?style=for-the-badge&logo=microscope)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## 🎯 Project Overview

AI Microscopy addresses the critical need for automated blood cell analysis in pathology labs. Traditional manual microscopic examination is time-consuming, prone to human error, and requires skilled technicians. Our platform provides:

- **Automated Detection**: Rapid identification of blood cells and parasites using YOLOv5
- **Explainable AI**: Grad-CAM heatmaps for transparent decision-making
- **Clinical Integration**: Seamless workflow integration with comprehensive reporting
- **Accessibility**: Web-based platform accessible to healthcare facilities worldwide

## 🚀 Features

### Core Functionality
- ✅ **Blood Cell Detection**: Automated identification of RBCs, WBCs, platelets, and malaria-infected cells
- ✅ **AI Explanations**: Visual heatmaps showing AI decision-making process
- ✅ **PDF Reporting**: Detailed diagnostic reports generation
- ✅ **Role-Based Access**: Secure access control for doctors and technicians
- ✅ **Real-time Analysis**: Fast processing with immediate results

### User Interface
- ✅ **Responsive Design**: Works seamlessly across all devices
- ✅ **Intuitive Navigation**: Clean, medical-focused interface
- ✅ **Dark Theme**: Professional appearance with red accent colors
- ✅ **Smooth Animations**: Enhanced user experience with Framer Motion
- ✅ **Drag & Drop**: Easy image upload functionality

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Fast build tool and development server
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend (Planned)
- **Flask** - Python web framework
- **YOLOv5** - Object detection model
- **TensorFlow** - Deep learning framework
- **OpenCV** - Computer vision library

### Database & Deployment
- **MongoDB** - NoSQL database for storing results
- **Docker** - Containerization for deployment
- **Google Cloud Platform** - Cloud hosting and scaling

## 📁 Project Structure

```
ai-microscopy/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Home.jsx     # Homepage with hero section
│   │   │   ├── About.jsx    # About page with project details
│   │   │   └── Navbar.jsx   # Navigation component
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── public/
│   │   └── microscope.svg   # Project logo
│   └── package.json         # Dependencies and scripts
├── backend/                  # Flask backend (planned)
├── models/                   # AI models and training scripts (planned)
└── README.md                # Project documentation
```

## 🎨 Design System

### Color Palette
- **Primary Background**: `#0a0a0f` (Dark navy)
- **Secondary Background**: `#15151f` (Darker gray)
- **Accent Colors**: Red gradient (`#ff1b1b` to `#ff6666`)
- **Text Colors**: White and red variations for contrast

### Key Design Elements
- **Microscope Logo**: Custom SVG icon representing the platform
- **Animated Blood Cells**: Floating background elements for visual appeal
- **Gradient Text**: Red gradient for headings and important text
- **Glass Morphism**: Subtle backdrop blur effects
- **Smooth Scrolling**: Lenis integration for enhanced UX

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-microscopy.git
   cd ai-microscopy
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Testing (when implemented)
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
```

## 📱 Current Pages

### 🏠 Homepage (`/`)
- **Hero Section**: Animated microscope logo with call-to-action
- **Project Overview**: Problem definition and solution explanation
- **Technology Stack**: Visual representation of technologies used
- **Features Showcase**: Key capabilities and benefits
- **Team Information**: Development team details
- **Footer**: Contact and project information

### ℹ️ About Page (`/about`)
- **Mission & Vision**: Project goals and objectives
- **Problem Analysis**: Challenges in traditional blood analysis
- **Our Approach**: 3-step methodology explanation
- **Impact & Benefits**: Statistics and measurable improvements
- **Technical Details**: Deep dive into AI implementation

### 🧭 Navigation
- **Centered Navigation**: Clean navbar with Home, Dashboard, About links
- **Responsive Design**: Mobile hamburger menu for smaller screens
- **Brand Identity**: "AI Microscopy" text logo with consistent theming

## 🔮 Roadmap

### Phase 1: Frontend Foundation ✅
- [x] Homepage with hero section and animations
- [x] About page with comprehensive project information
- [x] Responsive navigation system
- [x] Dark theme with red accents
- [x] Technology stack visualization

### Phase 2: Backend Development 🚧
- [ ] Flask API setup
- [ ] YOLOv5 model integration
- [ ] Image processing pipeline
- [ ] Database schema design
- [ ] Authentication system

### Phase 3: AI Integration 📋
- [ ] Blood cell detection model
- [ ] Grad-CAM implementation
- [ ] Model training and optimization
- [ ] Accuracy testing and validation
- [ ] Performance optimization

### Phase 4: Dashboard & Analysis 📋
- [ ] User dashboard interface
- [ ] Image upload functionality
- [ ] Real-time analysis display
- [ ] Results visualization
- [ ] PDF report generation

### Phase 5: Deployment & Testing 📋
- [ ] Docker containerization
- [ ] GCP deployment setup
- [ ] Performance testing
- [ ] Security implementation
- [ ] User acceptance testing

## 👥 Team

**VII Semester (Honors), CSE Department**

- **Moulik Paliwal** (Roll: 46) - Developer
- **Mayank Jaiswal** (Roll: 43) - Developer  
- **Harshita Khare** (Roll: 06) - Developer
- **Ankit Pande** (Roll: 29) - Developer

**Under the guidance of:**
- **Prof. Vishwas Bhagwat** - Department of Computer Science & Engineering

**Institution:**
- Shri Ramdeobaba College of Engineering & Management, Nagpur
- Session: 2025-26 [ODD Semester]

## 🤝 Contributing

We welcome contributions to improve AI Microscopy! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling consistency
- Implement responsive design for all components
- Add proper error handling and loading states
- Write clean, documented code with comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **BCCD Dataset** - Blood Cell Count and Detection dataset for training
- **YOLOv5** - Object detection architecture
- **Framer Motion** - Animation library for smooth interactions
- **Tailwind CSS** - Utility-first CSS framework
- **React Community** - For excellent documentation and support

## 📞 Contact

For questions, suggestions, or collaboration opportunities:

- **Project Repository**: [GitHub](https://github.com/your-username/ai-microscopy)
- **Institution**: Shri Ramdeobaba College of Engineering & Management
- **Department**: Computer Science & Engineering
- **Location**: Nagpur, Maharashtra, India

---

<div align="center">

**AI Microscopy** - *Transforming Medical Diagnostics Through AI*

Made with ❤️ by CSE Students | © 2025 All Rights Reserved

</div>