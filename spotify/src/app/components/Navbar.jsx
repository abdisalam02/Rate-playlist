// app/components/Navbar.jsx
import Link from 'next/link';

export default function Navbar() {
  return (
    <div className="navbar bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg mb-6">
      <div className="navbar-start">
        {/* Mobile hamburger menu */}
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/add-playlist">Add Playlist</Link>
            </li>
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost normal-case text-xl">
          My Music App
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal p-0">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/add-playlist">Add Playlist</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
