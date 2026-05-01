import "./App.css";
import { useEffect, useState, useRef } from "react";
import {useNavigate} from "react-router-dom";
export default function Landing() {
  const sections = [
  "You feel <span class='highlight'>challenged</span>.",
  "Good.",
  "If it feels <span class='highlight'>easy</span>,",
  "it won’t <span class='highlight'>sink in</span>.",
  "<span class='highlight'>Struggle intelligently.</span>",
  "final"
];

const navigate = useNavigate();
const [current, setCurrent] = useState(0);
const scrollAccumulator = useRef(0);
const isScrolling = useRef(false);
const [direction, setDirection] = useState(1);
const [showCTA, setShowCTA] = useState(false);

const handleScroll = (e) => {
  if (isScrolling.current) return;

  scrollAccumulator.current += e.deltaY;

  const threshold = 80;

  if (Math.abs(scrollAccumulator.current) > threshold) {
    isScrolling.current = true;

    const dir = scrollAccumulator.current > 0 ? 1 : -1;
    setDirection(dir);

    setCurrent((prev) =>
      Math.max(0, Math.min(prev + dir, sections.length - 1))
    );

    scrollAccumulator.current = 0;

    setTimeout(() => {
      isScrolling.current = false;
    }, 700);
  }
};

 useEffect(() => {
  if (current === sections.length - 1) {
    setTimeout(() => setShowCTA(true), 600); // delay = premium feel
  } else {
    setShowCTA(false);
  }
}, [current]);

  useEffect(() => {
    window.addEventListener("wheel", handleScroll);
    return () => window.removeEventListener("wheel", handleScroll);
  }, []);

  return (
//   <div className="landing">
//     <div key={current} className={`screen ${direction > 0 ? "down" : "up"}`}>
//       {current === sections.length - 1 ? (
//   <button className="cta-btn" onClick={() => navigate("/app")}>
//     SinkIn.ai
//   </button>
// ) : (
//   <h1 dangerouslySetInnerHTML={{ __html: sections[current] }}></h1>
// )}
//     </div>
//   </div>
<div key={current} className="screen">

  {current === sections.length - 1 ? (
    <>
      <h1 className="fade-text">Welcome to SinkIn.ai</h1>
      <div className="cta-container">
      {showCTA && (
        <button className="cta-btn cta-animate"
          onClick={() => navigate("/app")}
          >
          Start Thinking →
        </button>
      )}
      </div>
    </>
  ) : (
    <h1
      dangerouslySetInnerHTML={{ __html: sections[current] }}
    ></h1>
  )}

</div>
);
  
}