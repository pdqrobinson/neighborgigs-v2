## 🎨 Core Color Palette

### Primary — **Trust + Action**

**Evergreen —** `#1F7A5C`

**Use for**

- Primary buttons (Post Task, Accept Task, Pay Now)

- Active states

- Confirmation icons

- Progress indicators

**Do not**

- Use for long text blocks

- Use as a background for dense content

**Why**

- Reads as *stable + money-adjacent*

- Doesn’t scream fintech or crypto bro

- Works equally well for “Help my mom” and “I’ll grab milk”

---

### Secondary — **Friendly Accent**

**Soft Mint —** `#8ED1B2`

**Use for**

- Success states

- Helper badges

- Subtle highlights

- Empty-state illustrations

- “You’re good to go” moments

**Do not**

- Use as primary CTA color

- Use for critical alerts

**Why**

- Human, calming, supportive

- Softens the transactional moments

- Prevents the app from feeling cold

---

### Neutral Base — **Clarity & Legibility**

#### Charcoal — `#1F2933`

**Use for**

- Headings (H1–H4)

- Primary text

- Icons

- Navigation labels

This is your workhorse. If something matters, it’s charcoal.

---

#### Warm Gray — `#6B7280`

**Use for**

- Secondary text

- Helper metadata

- Timestamps

- Placeholder text

- Disclaimers

**Rule**\
If it’s not actionable or emotional, it’s gray.

---

#### Off-White — `#F9FAFB`

**Use for**

- App backgrounds

- Cards

- Sheets

- Email layouts

- Modal backdrops

**Why**

- Zero fatigue

- Reads clean on cheap phones and bright sunlight

- Lets green do the talking

---

### Alert / Money / Urgency

#### Amber — `#F59E0B`

**Use for**

- “Going out now”

- Urgent task tags

- Tips / bonuses

- Time-sensitive prompts

**Never**

- Use for errors

- Use for destructive actions

**Why**

- Urgency without panic

- Financial signal without red-alert stress

- Perfect for *“Heads up, not holy crap”*

---

## 🧠 Color Usage Rules (Important)

### CTA Hierarchy

1. **Primary CTA** → Evergreen

2. **Secondary CTA** → Outline Evergreen / Text Evergreen

3. **Tertiary** → Charcoal text only

If two buttons are both green, one of them shouldn’t exist.

---

### Emotional Mapping

- **Green** → “This is safe”

- **Mint** → “You’re doing fine”

- **Amber** → “Pay attention”

- **Charcoal** → “Read this”

- **Gray** → “FYI”

If a screen feels confusing, you broke this mapping.

---

## 🧱 UI Component Guidelines

### Buttons

- Primary: Evergreen background, white text

- Secondary: White background, Evergreen border + text


- Disabled: Warm Gray @ 40% opacity

Border radius: **10–12px** (friendly, not bubbly)

---

### Cards

- Background: Off-White

- Border: 1px Warm Gray @ 12% opacity

- Shadow: Very subtle (y=1–2, blur=6–8)

No heavy shadows. This isn’t a crypto dashboard.

---

### Tags & Badges

- Success → Soft Mint background, Charcoal text

- Urgent → Amber background, Charcoal text

- Neutral → Warm Gray background, White text

---

## ✉️ Email Compatibility (Underrated Win)

This palette:

- Renders clean in Gmail, Outlook, Apple Mail

- Doesn’t blow out on dark mode

- Prints legibly (yes, people still print emails)

Use:

- Evergreen for CTA buttons

- Charcoal for body text

- Amber sparingly for urgency

---

## 📱 Mobile Considerations

- Evergreen passes contrast on white (WCAG AA)

- Off-White prevents glare fatigue

- Amber stays readable in sunlight

- Mint doesn’t disappear on low-quality screens

This matters more than Dribbble points.

---

## 🧾 CSS Token Example (Hand This to Devs)

```markdown
:root {
  --color-primary: #1F7A5C;
  --color-secondary: #8ED1B2;

  --color-charcoal: #1F2933;
  --color-gray: #6B7280;
  --color-bg: #F9FAFB;

  --color-amber: #F59E0B;
}
```