import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "../Toast.jsx";
import { inr } from "../components/ui.jsx";

const DEFAULTS = {
  sleepSchedule: "flexible",
  foodHabits: "veg",
  cleanliness: 3,
  noiseTolerance: 3,
  studyHabits: "mixed",
  guestFrequency: "sometimes",
  smoking: "never",
  pets: "okay",
  choreStyle: "schedule",
  cookingFrequency: "sometimes",
  budgetMin: 3000,
  budgetMax: 8000,
  location: "",
};

const PROFILE_FIELDS = Object.keys(DEFAULTS);
const REQUIRED_CHOICES = [
  "sleepSchedule",
  "foodHabits",
  "studyHabits",
  "guestFrequency",
  "smoking",
  "pets",
  "choreStyle",
  "cookingFrequency",
];

function initialPreferences(user) {
  const preferences = { ...DEFAULTS, ...(user.preferences || {}) };
  if (!user.profileComplete) {
    REQUIRED_CHOICES.forEach((field) => { preferences[field] = ""; });
  }
  return preferences;
}

function Choice({ label, hint, value, onChange, options }) {
  return (
    <fieldset className="preference-field">
      <legend>{label} <span className="required-mark">Choose one</span></legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="choice-grid" role="group" aria-label={label}>
        {options.map(([optionValue, title, description]) => (
          <button
            type="button"
            key={optionValue}
            className="choice-card"
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            <span className="choice-check" aria-hidden="true">{value === optionValue ? "✓" : ""}</span>
            <b>{title}</b>
            {description && <small>{description}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Slider({ label, value, onChange, low, high, hint }) {
  const descriptions = ["Very relaxed", "Mostly relaxed", "In the middle", "Quite particular", "Very particular"];
  return (
    <div className="range-field">
      <label>
        <span className="range-title">{label}<b>{descriptions[value - 1]}</b></span>
        {hint && <span className="hint">{hint}</span>}
        <input type="range" min="1" max="5" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </label>
      <div className="range-ends" aria-hidden="true"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

function SectionHeading({ number, icon, title, children }) {
  return (
    <div className="preference-section-heading">
      <span className="preference-section-icon" aria-hidden="true">{icon}</span>
      <div><span className="preference-section-number">0{number} / ROOMMATE FIT</span><h2>{title}</h2><p>{children}</p></div>
    </div>
  );
}

export default function Preferences() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [p, setP] = useState(() => initialPreferences(user));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialPreferences(user)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const returning = user.profileComplete;
  const set = (key) => (value) => setP((current) => ({ ...current, [key]: value }));

  const dirty = JSON.stringify(p) !== savedSnapshot;
  const completedFields = PROFILE_FIELDS.filter((field) => p[field] !== "" && p[field] !== null && p[field] !== undefined).length;
  const completion = Math.round((completedFields / PROFILE_FIELDS.length) * 100);
  const budgetInvalid = Number(p.budgetMin) < 0 || Number(p.budgetMax) < Number(p.budgetMin);
  const budgetDifference = Number(p.budgetMax) - Number(p.budgetMin);
  const missingChoices = REQUIRED_CHOICES.filter((field) => !p[field]);
  const summary = useMemo(() => [
    ["Sleep", { early: "Early bird", flexible: "Flexible", night: "Night owl" }[p.sleepSchedule]],
    ["Guests", { rarely: "Rarely", sometimes: "Sometimes", often: "Often" }[p.guestFrequency]],
    ["Pets", { love: "Loves pets", okay: "Pets are okay", avoid: "Pet-free" }[p.pets]],
    ["Chores", { together: "Together", schedule: "Rota", flexible: "As needed" }[p.choreStyle]],
  ], [p.sleepSchedule, p.guestFrequency, p.pets, p.choreStyle]);

  async function save(event) {
    event.preventDefault();
    setError("");
    if (budgetInvalid) {
      setError("Your maximum monthly budget needs to be at least your minimum budget.");
      return;
    }
    if (missingChoices.length) {
      setError("Choose an option for each lifestyle preference before viewing matches.");
      return;
    }
    setSaving(true);
    try {
      const cleanPreferences = {
        ...p,
        location: p.location.trim(),
        budgetMin: Number(p.budgetMin),
        budgetMax: Number(p.budgetMax),
      };
      const data = await api.savePreferences(cleanPreferences);
      setUser(data.user);
      setP({ ...DEFAULTS, ...(data.user.preferences || {}) });
      setSavedSnapshot(JSON.stringify({ ...DEFAULTS, ...(data.user.preferences || {}) }));
      toast("Your roommate profile is up to date");
      if (!returning) navigate("/matches");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setP(initialPreferences(user));
    setError("");
  }

  return (
    <form className="page preferences-page" onSubmit={save}>
      <header className="preferences-hero">
        <div className="preferences-intro">
          <span className="eyebrow">YOUR ROOMMATE BLUEPRINT</span>
          <h1>{returning ? "The way you live." : "Let's find your kind of home."}</h1>
          <p>Good roommate matches start with the real details. Tell us what sharing a home actually looks like for you.</p>
          <div className="preferences-chips" aria-label="Profile highlights">
            {summary.map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}
          </div>
        </div>
        <div className="profile-progress">
          <div className="progress-ring" style={{ "--progress": `${completion}%` }}><b>{completion}<small>%</small></b></div>
          <span>{completion === 100 ? "Profile ready" : "Profile setup"}</span>
          <small>{completedFields} of {PROFILE_FIELDS.length} details filled</small>
        </div>
      </header>

      <div className="preferences-note"><span aria-hidden="true">✦</span><p><b>Your answers help find a better fit.</b> We compare everyday habits and show both the good overlap and the things worth discussing before you move in.</p></div>

      <section className="panel preferences-section">
        <SectionHeading number="1" icon="◷" title="Daily rhythm">The little routines that shape a shared day.</SectionHeading>
        <div className="preference-fields">
          <Choice label="When are you usually up?" hint="Think about your usual weekday, not your ideal weekend." value={p.sleepSchedule} onChange={set("sleepSchedule")}
            options={[["early", "Early bird", "Up with the sun"], ["flexible", "It depends", "My schedule shifts"], ["night", "Night owl", "Most alive after dark"]]} />
          <Choice label="How do you like to study or work at home?" value={p.studyHabits} onChange={set("studyHabits")}
            options={[["silent", "Quiet focus", "I need a calm room"], ["mixed", "A bit of both", "Quiet, with breaks"], ["social", "Around people", "I like some background energy"]]} />
          <Choice label="How often do you have people over?" hint="Include friends, partners and family visits." value={p.guestFrequency} onChange={set("guestFrequency")}
            options={[["rarely", "Not often", "Home is my quiet space"], ["sometimes", "Sometimes", "A few visits here and there"], ["often", "Pretty often", "Friends are part of home life"]]} />
        </div>
      </section>

      <section className="panel preferences-section">
        <SectionHeading number="2" icon="⌂" title="The shared space">Set expectations for the kitchen, cleaning and comfort.</SectionHeading>
        <div className="preference-fields">
          <Choice label="What's your food preference?" value={p.foodHabits} onChange={set("foodHabits")}
            options={[["veg", "Vegetarian", "Vegetarian kitchen"], ["eggetarian", "Eggetarian", "Vegetarian plus eggs"], ["nonveg", "Non-vegetarian", "Comfortable with meat"]]} />
          <div className="preference-fields range-grid">
            <Slider label="Cleanliness" value={p.cleanliness} onChange={set("cleanliness")} low="Easygoing" high="Very tidy" hint="What feels comfortable in shared spaces?" />
            <Slider label="Noise comfort" value={p.noiseTolerance} onChange={set("noiseTolerance")} low="Prefer quiet" high="Noise is fine" hint="Think music, calls and everyday sounds." />
          </div>
          <Choice label="What's your comfort level with smoking?" value={p.smoking} onChange={set("smoking")}
            options={[["never", "Smoke-free", "Prefer a smoke-free home"], ["outside", "Outside only", "Only away from shared spaces"], ["indoors", "I'm comfortable", "Indoor smoking is okay"]]} />
          <Choice label="How do you feel about pets at home?" hint="Consider your comfort and any allergies." value={p.pets} onChange={set("pets")}
            options={[["love", "Love pets", "Happy to live with them"], ["okay", "Pets are okay", "Open to the right fit"], ["avoid", "Prefer pet-free", "I would rather not share with pets"]]} />
          <Choice label="How should chores work?" value={p.choreStyle} onChange={set("choreStyle")}
            options={[["together", "Do it together", "Tidy up as a team"], ["schedule", "A clear rota", "Take turns on a schedule"], ["flexible", "As needed", "Pitch in when things need doing"]]} />
          <Choice label="How often do you cook at home?" value={p.cookingFrequency} onChange={set("cookingFrequency")}
            options={[["rarely", "Not much", "Mostly eat out or order in"], ["sometimes", "Some days", "Mix of home cooking and eating out"], ["often", "Most days", "The kitchen gets regular use"]]} />
        </div>
      </section>

      <section className="panel preferences-section">
        <SectionHeading number="3" icon="₹" title="Budget & location">Start with a comfortable monthly range, then tell us where.</SectionHeading>
        <div className="budget-fields">
          <label>Minimum monthly rent budget
            <span className="input-with-prefix"><span>₹</span><input required type="number" min="0" step="500" value={p.budgetMin} onChange={(event) => set("budgetMin")(event.target.value)} /></span>
          </label>
          <label>Maximum monthly rent budget
            <span className="input-with-prefix"><span>₹</span><input required type="number" min="0" step="500" value={p.budgetMax} onChange={(event) => set("budgetMax")(event.target.value)} /></span>
          </label>
          <label className="location-field">Preferred area or neighborhood
            <input maxLength={100} placeholder="e.g. Madhapur, Hyderabad" value={p.location} onChange={(event) => set("location")(event.target.value)} />
            <span className="hint">A city or neighborhood is enough. You can leave this blank if you're flexible.</span>
          </label>
        </div>
        <div className={`budget-preview${budgetInvalid ? " invalid" : ""}`} aria-live="polite">
          <span aria-hidden="true">{budgetInvalid ? "!" : "₹"}</span>
          <p>{budgetInvalid ? "Check your budget range" : budgetDifference === 0 ? `${inr(Number(p.budgetMin))} per month is your target` : `${inr(Number(p.budgetMin))} – ${inr(Number(p.budgetMax))} per month`}
            <small>{budgetInvalid ? "Your maximum should be the same as or higher than your minimum." : "A realistic range helps surface roommates with a closer rent fit."}</small>
          </p>
        </div>
      </section>

      {error && <p className="error preferences-error" role="alert">{error}</p>}
      <footer className="preferences-actions">
        <p className="muted small">{dirty ? "You have unsaved changes." : "Your profile is saved and ready for matching."}</p>
        <div>
          {dirty && <button className="btn quiet" type="button" onClick={reset} disabled={saving}>Discard changes</button>}
          {returning && <Link className="text-btn preferences-back" to="/matches">Back to matches</Link>}
          <button className="btn" disabled={saving || !dirty || budgetInvalid || missingChoices.length > 0}>{saving ? "Saving profile…" : returning ? "Save preferences" : "Save profile & see matches"}</button>
        </div>
      </footer>
    </form>
  );
}
