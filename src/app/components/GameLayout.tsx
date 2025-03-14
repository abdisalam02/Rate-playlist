export const GameLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#181818]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          {subtitle && (
            <p className="text-[#B3B3B3] text-lg">{subtitle}</p>
          )}
        </motion.div>
        {children}
      </div>
    </div>
  );
}; 