// Initials on a soft tint. The tint comes from the name, so a person keeps the
// same colour everywhere in the app.
function hue(name) {
  let h = 0;
  for (const ch of name || "?") h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export default function Avatar({ name = "?", size = 40 }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const h = hue(name);
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${h} 42% 88%)`,
        color: `hsl(${h} 45% 24%)`,
      }}
    >
      {initials}
    </span>
  );
}
