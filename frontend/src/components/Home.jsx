import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "@studio-freight/lenis";

const HomePage = () => {
  
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);


  const BloodCell = ({
    size = 100,
    delay = 0,
    position = "absolute",
    color = "#ff1b1b",
  }) => (
    <motion.div
      className={`${position} rounded-full`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.8, 0.4, 0.8, 0],
        scale: [0.5, 1.1, 0.8, 1, 1.2],
        y: [0, -30, 0, 30, 0],
        x: [0, 20, -20, 10, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        delay: delay,
        ease: "easeInOut",
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, #fff, ${color} 60%, #850000)`,
          filter: "blur(3px)",
          boxShadow: `0 0 20px ${color}80`,
        }}
      />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BloodCell
          size={150}
          delay={0}
          color="#ff1b1b"
          style={{ top: "20%", left: "10%" }}
        />
        <BloodCell
          size={80}
          delay={1}
          color="#ff5555"
          style={{ top: "60%", left: "15%" }}
        />
        <BloodCell
          size={120}
          delay={2}
          color="#ff3333"
          style={{ top: "40%", right: "10%" }}
        />
        <BloodCell
          size={70}
          delay={3}
          color="#ff1b1b"
          style={{ bottom: "20%", right: "20%" }}
        />
        <BloodCell
          size={100}
          delay={4}
          color="#ff5555"
          style={{ bottom: "30%", left: "30%" }}
        />
      </div>
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-[#0a0a0f] z-10"></div>
        
        <div className="relative z-20 text-center px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="inline-flex items-center justify-center mb-8">
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-600/20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-5">
                  <img
                    src="/microscope.svg"
                    alt="Microscope"
                    className="w-full h-full object-contain filter brightness-0 invert"
                  />
                </div>
              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                AI Microscopy
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl md:text-2xl max-w-2xl mx-auto text-red-200 font-light"
            >
              Revolutionizing Blood Cell Analysis with Deep Learning
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <motion.a
              href="/dashboard"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 30px rgba(255, 27, 27, 0.4)",
              }}
              whileTap={{ scale: 0.98 }}
              className="inline-block bg-gradient-to-r from-red-600 to-red-800 text-white px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Analysis Now
            </motion.a>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </section>

      <section className="relative py-20 bg-[#0f0f15]">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              Advanced Blood Cell Analysis
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              An end-to-end AI platform for automated detection and
              classification of blood cells
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-[#15151f] rounded-2xl p-8 border border-red-900/50 shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-red-400">
                Problem Definition
              </h3>
              <p className="text-red-100 mb-6">
                Current blood cell analysis in pathology labs relies heavily on
                manual microscopic examination, which is time-consuming, prone
                to human error, and requires skilled technicians.
              </p>
              <div className="bg-[#1a1a25] rounded-xl p-6">
                <p className="text-red-300 font-medium">
                  "There is a critical need for an automated AI-powered system
                  that can accurately detect, classify, and count blood cells
                  including RBCs, WBCs, platelets, and malaria-infected cells."
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-[#15151f] rounded-2xl p-8 border border-red-900/50 shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-red-400">
                Our Solution
              </h3>
              <p className="text-red-100 mb-6">
                AI Microscopy provides a comprehensive web-based platform for
                automated blood cell detection and classification using deep
                learning models.
              </p>

              <div className="space-y-4">
                {[
                  "YOLOv5 object detection CNN trained on BCCD dataset",
                  "Intuitive drag-and-drop interface",
                  "Grad-CAM heatmaps for explainable AI",
                  "Role-based access control",
                  "Detailed PDF report generation",
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="mt-1 mr-3 text-red-500">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-red-100">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative py-20 bg-[#0a0a0f]">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              Technology Stack
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Modern technologies powering our AI-driven microscopy platform
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "React", color: "#61DAFB" },
              { name: "Flask", color: "#000000" },
              { name: "YOLO", color: "#FF0000" },
              { name: "MongoDB", color: "#47A248" },
              { name: "Docker", color: "#2496ED" },
              { name: "AWS", color: "#4285F4" },
              { name: "PyTorch", color: "#FF6F00" },
              { name: "OpenCV", color: "#5C3EE8" },
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#15151f] rounded-xl p-6 flex flex-col items-center justify-center border border-red-900/30 hover:border-red-700 transition-all duration-300"
              >
                <div
                  className="w-16 h-16 rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: tech.color + "20" }}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: tech.color }}
                  ></div>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {tech.name}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 bg-gradient-to-b from-[#0a0a0f] to-[#150f15]">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              Key Features
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Advanced capabilities for modern medical diagnostics
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Automated Detection",
                desc: "Rapid identification of blood cells and parasites using YOLOv5",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 12H19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 12H3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 5V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 21V19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Explainable AI",
                desc: "Heatmaps with intuitive overlays highlight diagnoses",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 12H17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 7L12 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Secure & Accessible",
                desc: "Role-based access with encrypted cloud deployment",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "PDF Reporting",
                desc: "Generate detailed diagnostic reports instantly",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2V8H20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 13H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 17H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 9H9H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Cloud Deployment",
                desc: "Dockerized on AWS for seamless scalability",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17.5 19H9C7.5 19 6 17.5 6 16C6 15 6.5 14 7.5 13.5C7.6 12.1 8.8 11 10.2 11C10.6 11 11 11.1 11.4 11.3C12.2 9.4 14.4 8.3 16.3 8.9C17.2 7.5 18.8 6.6 20.5 6.9C21.9 7.2 23 8.4 23 10C23 11.3 22.2 12.4 21 12.8C21.6 13.5 22 14.4 22 15.5C22 17.4 20.4 19 18.5 19C18.3 19 18 19 17.8 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 15L7 17L9 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 15L17 17L15 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "User Management",
                desc: "Role-based access for doctors and technicians",
                icon: (
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17 4C17.7956 4 18.5587 4.31607 19.1213 4.87868C19.6839 5.44129 20 6.20435 20 7C20 7.79565 19.6839 8.55871 19.1213 9.12132C18.5587 9.68393 17.7956 10 17 10C16.2044 10 15.4413 9.68393 14.8787 9.12132C14.3161 8.55871 14 7.79565 14 7C14 6.20435 14.3161 5.44129 14.8787 4.87868C15.4413 4.31607 16.2044 4 17 4Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#15151f] rounded-2xl p-8 border border-red-900/30 hover:border-red-600 transition-all duration-300 group"
              >
                <div className="text-red-500 mb-5 group-hover:text-red-400 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-red-200">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 bg-[#0f0f15]">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              Our Team
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Students of VII Semester (Honors), CSE Department
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Moulik Paliwal", roll: "46", role: "Developer" },
              { name: "Mayank Jaiswal", roll: "43", role: "Developer" },
              { name: "Harshita Khare", roll: "06", role: "Developer" },
              { name: "Ankit Pande", roll: "29", role: "Developer" },
            ].map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#15151f] rounded-2xl p-6 border border-red-900/30 hover:border-red-600 transition-all duration-300 text-center"
              >
                <div className="relative mx-auto mb-5">
                  <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 bg-red-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                    {member.roll}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1 text-white">
                  {member.name}
                </h3>
                <p className="text-red-400 mb-3">{member.role}</p>
                <p className="text-sm text-red-300">
                  Computer Science & Engineering
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-lg text-red-300 mb-2">Under the guidance of</p>
            <div className="inline-flex items-center justify-center bg-[#1a1a25] rounded-xl px-6 py-4 border border-red-900/50">
              <div className="mr-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">V</span>
                </div>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white">Prof. Vishwas Bhagwat</h3>
                <p className="text-red-400">
                  Department of Computer Science & Engineering
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* <section className="relative py-16 bg-[#0a0a0f] border-t border-red-900/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mb-4">
              Toast Notifications
            </h2>
            <p className="text-red-300 max-w-2xl mx-auto">
              Experience our custom animated toast system with beautiful animations and smooth transitions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Import toast from react-toastify or your preferred toast library first
                // Example: import { toast } from 'react-toastify';
                console.log('Success button clicked');
                // Replace with toast implementation after importing
              }}
              className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
            >
              Success Toast
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.error('This is an error message! ❌')}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
            >
              Error Toast
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.warning('This is a warning message! ⚠️')}
              className="bg-gradient-to-r from-yellow-600 to-yellow-800 hover:from-yellow-700 hover:to-yellow-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
            >
              Warning Toast
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.info('This is an info message! ℹ️')}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
            >
              Info Toast
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mt-8"
          >
            <p className="text-red-400 text-sm">
              Click any button above to see the beautiful toast animations in action!
            </p>
          </motion.div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="relative py-12 bg-[#0a0a0f] border-t border-red-900/20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 mb-4">
              <svg
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M3 3H21V21H3V3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 9H9V15H15V9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              AI Microscopy
            </h3>
          </motion.div>

          <p className="text-red-300 max-w-2xl mx-auto mb-6">
            End-to-End Web Platform for Blood Cell Detection & Classification
            using CNNs
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8">
            <div className="text-red-400">
              <p className="font-semibold">
                Shri Ramdeobaba College of Engineering & Management
              </p>
              <p>Nagpur, Session: 2025-26 [ODD Semester]</p>
            </div>
          </div>

          <p className="text-red-500 text-sm">
            &copy; 2025 AI Microscopy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
