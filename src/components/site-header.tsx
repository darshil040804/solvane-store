"use client";

import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import {
  BagIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";

const primaryNav = [
  { label: "Home", href: "/" },
  { label: "Shop all", href: "/shop" },
  { label: "New In", href: "/collections/new-in" },
  { label: "Women", href: "/collections/women" },
  { label: "Men", href: "/collections/men" },
  { label: "Bags & Small Leather Goods", href: "/collections/bags" },
  { label: "Shoes", href: "/collections/shoes" },
  { label: "Jewelry & Watches", href: "/collections/jewelry" },
];

const secondaryNav = [
  { label: "Services", href: "/services" },
  { label: "Contact us", href: "/contact" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "My account", href: "/account" },
];

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 8,
    () => false,
  );

  const menuRef = useRef<HTMLDialogElement>(null);
  const openMenu = () => menuRef.current?.showModal();
  const closeMenu = () => menuRef.current?.close();

  return (
    <>
      {/*
        Solid by default. A page with a full-bleed hero marks itself with
        data-hero-page, and globals.css then makes this header transparent until
        the page scrolls (data-scrolled). Pure CSS, so it is right on first paint
        and after client-side navigation, without reading the path in JavaScript.
      */}
      <header
        data-scrolled={scrolled ? "" : undefined}
        className="site-header fixed inset-x-0 top-0 z-40 border-b border-line bg-surface text-ink transition-colors duration-300 ease-standard"
      >
        <div className="header-bar">
          <div className="flex items-center gap-1 md:gap-4">
            <button
              type="button"
              onClick={openMenu}
              className="btn-icon md:w-auto md:gap-2 md:px-3 md:inline-flex md:items-center"
              aria-label="Open menu"
            >
              <MenuIcon />
              <span className="hidden text-body-sm md:inline">Menu</span>
            </button>
            <Link
              href="/search"
              className="btn-icon md:w-auto md:gap-2 md:px-3 md:inline-flex md:items-center"
              aria-label="Search"
            >
              <SearchIcon />
              <span className="hidden text-body-sm md:inline">Search</span>
            </Link>
          </div>

          <Link
            href="/"
            className="text-title tracking-[0.35em] uppercase md:text-heading"
            aria-label="Solvane home"
          >
            Solvane
          </Link>

          <div className="flex items-center gap-1 md:gap-2">
            <Link
              href="/contact"
              className="link-quiet mr-2 hidden text-body-sm lg:inline"
            >
              Contact us
            </Link>
            <Link
              href="/wishlist"
              className="btn-icon hidden sm:grid"
              aria-label="Wishlist"
            >
              <HeartIcon />
            </Link>
            <Link href="/account" className="btn-icon" aria-label="Account">
              <UserIcon />
            </Link>
            <Link href="/cart" className="btn-icon" aria-label="Shopping bag">
              <BagIcon />
            </Link>
          </div>
        </div>
      </header>

      {/* Pages start below the fixed header; hero pages pull themselves back up under it. */}
      <div aria-hidden="true" className="h-header shrink-0" />

      <dialog
        ref={menuRef}
        aria-label="Menu"
        onClick={(event) => {
          // A click on the dialog itself (not its content) is a backdrop click.
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-md bg-surface text-ink backdrop:bg-black/40 open:flex"
      >
        <div className="flex w-full flex-col overflow-y-auto">
          <div className="flex h-header shrink-0 items-center px-gutter">
            <button
              type="button"
              onClick={closeMenu}
              className="btn-icon -ml-2 gap-2"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <nav aria-label="Main" className="flex flex-1 flex-col px-gutter pb-10">
            <ul className="flex flex-col gap-1 py-4">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="link-quiet block py-2 text-title"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <hr className="divider my-6" />
            <ul className="flex flex-col gap-1">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="link-quiet block py-1.5 text-body text-ink-muted hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
