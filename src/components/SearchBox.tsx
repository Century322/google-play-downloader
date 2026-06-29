import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  placeholder?: string;
}

export default function SearchBox({ onSearch, initialValue = "", placeholder = "搜索应用名称..." }: SearchBoxProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      abortRef.current?.abort();
      setLoadingSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.slice(0, 6));
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Failed to fetch suggestions:", error);
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape" && query) {
        handleClear();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          handleSuggestionClick(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 placeholder-slate-400 font-sans text-base"
          />
          <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />

          {loadingSuggestions ? (
            <Loader2 className="absolute right-4 w-5 h-5 text-blue-500 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-20">
          <ul className="py-2" role="listbox" id="search-suggestions">
            {suggestions.map((suggestion, index) => (
              <li key={index} role="option" id={`suggestion-${index}`} aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full px-5 py-3 text-left transition-colors flex items-center gap-3 font-sans ${
                    index === activeIndex ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>{suggestion}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
