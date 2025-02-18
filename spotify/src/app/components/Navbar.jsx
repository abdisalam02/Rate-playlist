import Link from 'next/link';
import ThemeToggleButton from './ThemeDropdown';

export default function Navbar() {
  return (
    <div className="navbar bg-base-200 shadow-lg mb-6 px-4">
      <div className="navbar-start">
        {/* Mobile hamburger menu */}
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <ul 
            tabIndex={0}
            className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li className="py-3 text-lg">
              <Link href="/" className="text-base-content">Home</Link>
            </li>
            <li className="py-3 text-lg">
              <Link href="/add-playlist" className="text-base-content">Add Playlist</Link>
            </li>
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost normal-case text-xl text-base-content">
          My Music App
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal p-0">
          <li><Link href="/" className="text-base-content">Home</Link></li>
          <li><Link href="/add-playlist" className="text-base-content">Add Playlist</Link></li>
        </ul>
      </div>
      <div className="navbar-end">
        <ThemeToggleButton />
      </div>
    </div>
  );
}
