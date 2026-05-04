export function Card({ children, className = '' }) {
  return <div className={`panel p-6 ${className}`}>{children}</div>;
}
