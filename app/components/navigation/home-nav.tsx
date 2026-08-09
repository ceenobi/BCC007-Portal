import { Link, NavLink } from "react-router";
import type { SessionUser } from "~/types";
import { Button } from "../ui/button";
import Logo from "./logo";
import Menu from "./menu";

const links = [
  { name: "About", href: "#about" },
  { name: "Services", href: "#services" },
  { name: "Contact", href: "/contact" },
];

export default function HomeNav({ user }: { user?: SessionUser | null }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b backdrop-blur supports-backdrop-filter:bg-background/5">
      <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
        <div className="flex gap-16 items-center">
          <Logo size={8} showLogoText={true} classname="text-xl" />
          <div className="hidden md:flex gap-4 items-center">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                className="cursor-pointer text-sm font-medium hover:text-mainBlue hover:dark:text-lightBlue"
              >
                {({ isActive }) => (
                  <span
                    className={
                      isActive && link.name === "Contact"
                        ? "text-lightBlue"
                        : ""
                    }
                  >
                    {link.name}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        {user ? (
          <div className="flex gap-3 items-center">
            <Link to="/dashboard">
              <Button size="sm" className="hidden md:block btn">
                Dashboard
              </Button>
            </Link>
            <Menu user={user} />
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm" className="hidden md:block bg-transparent">
                Login
              </Button>
            </Link>
            <Link to="/auth/register">
              <Button size="sm" className="btn">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
