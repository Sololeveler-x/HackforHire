import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/sgb-logo.png?v=5" 
            alt="SGB Logo" 
            className="h-10 w-10 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <span className="font-heading text-xl font-bold text-primary">SGB Agro Industries</span>
            <p className="text-xs text-muted-foreground">Internal Order Management</p>
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
