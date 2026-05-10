export function Card({ children, className = '', ...props }) {
  return (
    <div className={`panel p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
