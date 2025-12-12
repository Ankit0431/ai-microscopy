import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "@studio-freight/lenis";

const About = () => {
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
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden pt-16">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BloodCell
          size={120}
          delay={0}
          color="#ff1b1b"
          style={{ top: "15%", left: "8%" }}
        />
        <BloodCell
          size={90}
          delay={1.5}
          color="#ff5555"
          style={{ top: "70%", left: "12%" }}
        />
        <BloodCell
          size={110}
          delay={3}
          color="#ff3333"
          style={{ top: "35%", right: "15%" }}
        />
        <BloodCell
          size={80}
          delay={4.5}
          color="#ff1b1b"
          style={{ bottom: "25%", right: "25%" }}
        />
        <BloodCell
          size={95}
          delay={2}
          color="#ff5555"
          style={{ bottom: "40%", left: "35%" }}
        />
      </div>

      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-[#0a0a0f] z-10"></div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ff1b1b10_0%,transparent_70%)]"></div>
          </div>
        </div>

        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold mb-6 tracking-tight"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                About AI Microscopy
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl md:text-2xl max-w-3xl mx-auto text-red-200 font-light leading-relaxed"
            >
              Transforming medical diagnostics through cutting-edge artificial
              intelligence and deep learning technologies
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 bg-[#0f0f15]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-[#15151f] rounded-2xl p-8 border border-red-900/50 shadow-lg"
            >
              <div className="text-red-500 mb-6">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-red-400">
                Our Mission
              </h3>
              <p className="text-red-100 leading-relaxed">
                To revolutionize blood cell analysis by providing healthcare
                professionals with an intelligent, accurate, and efficient
                AI-powered platform that enhances diagnostic capabilities and
                improves patient outcomes through automated microscopic
                examination.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-[#15151f] rounded-2xl p-8 border border-red-900/50 shadow-lg"
            >
              <div className="text-red-500 mb-6">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-red-400">
                Our Vision
              </h3>
              <p className="text-red-100 leading-relaxed">
                To become the leading AI-driven diagnostic platform that
                democratizes advanced medical analysis, making precise blood
                cell detection and classification accessible to healthcare
                facilities worldwide, ultimately contributing to better global
                health outcomes.
              </p>
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
              The Challenge We Address
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Traditional blood analysis faces significant limitations that our
              AI platform overcomes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Manual Analysis",
                problem: "Time-consuming manual microscopic examination",
                solution: "Automated AI-powered detection in seconds",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 6V12L16 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Human Error",
                problem: "Subjective interpretation and potential mistakes",
                solution:
                  "Consistent, objective AI analysis with high accuracy",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.29 3.86L1.82 18A2 2 0 0 0 3.64 21H20.36A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="12"
                      y1="9"
                      x2="12"
                      y2="13"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="12"
                      y1="17"
                      x2="12.01"
                      y2="17"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ),
              },
              {
                title: "Limited Access",
                problem: "Requires specialized expertise and equipment",
                solution:
                  "Web-based platform accessible to all healthcare providers",
                icon: (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="16"
                      r="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M7 11V7A5 5 0 0 1 17 7V11"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ),
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#15151f] rounded-2xl p-6 border border-red-900/30 hover:border-red-600 transition-all duration-300"
              >
                <div className="text-red-500 mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {item.title}
                </h3>
                <div className="space-y-3">
                  <div className="bg-red-900/20 rounded-lg p-3">
                    <p className="text-red-300 text-sm font-medium mb-1">
                      Problem:
                    </p>
                    <p className="text-red-200 text-sm">{item.problem}</p>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-3">
                    <p className="text-green-300 text-sm font-medium mb-1">
                      Our Solution:
                    </p>
                    <p className="text-green-200 text-sm">{item.solution}</p>
                  </div>
                </div>
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
              Our Approach
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Combining cutting-edge AI with medical expertise for superior
              diagnostic accuracy
            </p>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Deep Learning Foundation",
                description:
                  "Built on YOLOv5 architecture, trained on comprehensive blood cell datasets including BCCD for robust detection capabilities.",
                features: [
                  "Convolutional Neural Networks",
                  "Object Detection",
                  "Multi-class Classification",
                ],
              },
              {
                step: "02",
                title: "Explainable AI Integration",
                description:
                  "Grad-CAM heatmaps provide visual explanations for AI decisions, ensuring transparency and building trust with medical professionals.",
                features: [
                  "Visual Explanations",
                  "Decision Transparency",
                  "Medical Validation",
                ],
              },
              {
                step: "03",
                title: "Clinical Workflow Integration",
                description:
                  "Seamless integration into existing medical workflows with intuitive interfaces and comprehensive reporting capabilities.",
                features: [
                  "User-Friendly Interface",
                  "PDF Reports",
                  "Role-Based Access",
                ],
              },
            ].map((approach, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } items-center gap-8`}
              >
                <div className="flex-1">
                  <div className="bg-[#15151f] rounded-2xl p-8 border border-red-900/50 shadow-lg">
                    <div className="flex items-center mb-4">
                      <span className="text-4xl font-bold text-red-500 mr-4">
                        {approach.step}
                      </span>
                      <h3 className="text-2xl font-bold text-white">
                        {approach.title}
                      </h3>
                    </div>
                    <p className="text-red-200 mb-6 leading-relaxed">
                      {approach.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {approach.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="px-3 py-1 bg-red-900/30 text-red-300 rounded-full text-sm border border-red-800/50"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-br from-red-600/20 to-red-800/20 flex items-center justify-center border border-red-700/30">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">
                        {approach.step}
                      </span>
                    </div>
                  </div>
                </div>
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
              Impact & Benefits
            </h2>
            <p className="text-lg text-red-200 max-w-3xl mx-auto">
              Measurable improvements in diagnostic accuracy, efficiency, and
              accessibility
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                metric: "95%+",
                label: "Detection Accuracy",
                description: "High precision in blood cell identification",
              },
              {
                metric: "10x",
                label: "Faster Analysis",
                description: "Reduced time from hours to minutes",
              },
              {
                metric: "24/7",
                label: "Availability",
                description: "Round-the-clock diagnostic capability",
              },
              {
                metric: "100%",
                label: "Consistency",
                description: "Eliminates human variability in analysis",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#15151f] rounded-2xl p-6 border border-red-900/30 text-center hover:border-red-600 transition-all duration-300"
              >
                <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">
                  {stat.metric}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {stat.label}
                </h3>
                <p className="text-red-200 text-sm">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative py-12 bg-[#0a0a0f] border-t border-red-900/20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 mb-4">
              <img
                src="/microscope.svg"
                alt="Microscope"
                className="w-8 h-8 object-contain filter brightness-0 invert"
              />
            </div>
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              AI Microscopy
            </h3>
          </motion.div>

          <p className="text-red-300 max-w-2xl mx-auto mb-6">
            Advancing medical diagnostics through artificial intelligence and
            deep learning
          </p>

          <p className="text-red-500 text-sm">
            &copy; 2025 AI Microscopy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;