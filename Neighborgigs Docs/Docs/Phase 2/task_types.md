## Final Phase 2 Broadcast Task Types (Locked at 5)

### 1️⃣ Pickup / Errand

**Slug:** `pickup`\
**Icon:** 🛒

**What it covers**

- Grocery runs

- Store pickups

- Grabbing items while already out

**Examples**

- “Can you grab paper towels from Target?”

- “Anyone already at Costco?”

👉 This will be your highest-volume type. Non-negotiable.

---

### 2️⃣ Drop-off / Delivery

**Slug:** `dropoff`\
**Icon:** 📦

**What it covers**

- Returning items

- Dropping packages

- One-way handoffs

**Examples**

- “Can you return this to UPS?”

- “Drop this envelope off downtown”

Keeps intent clear vs pickup.

---

### 3️⃣ Route / Travel

**Slug:** `route`\
**Icon:** 🚗

**What it covers**

- Long-distance help

- Along-the-way pickups

- “Already going there” broadcasts

**Examples**

- “Driving to Phoenix tomorrow”

- “Heading back from Flagstaff this weekend”

This is where *“everyone is our neighbor”* actually works.

---

### 4️⃣ Help / Assistance

**Slug:** `help`\
**Icon:** 🤝

**What it covers**

- Small, time-boxed help

- Non-professional, low-commitment tasks

**Examples**

- “Help clean out the BBQ pit”

- “Help organize a small area”

⚠️ This stays intentionally broad and slightly de-emphasized in UI.


---

### 5️⃣ Other

**Slug:** `other`\
**Icon:** ✍️

**What it covers**

- Edge cases

- Anything that doesn’t fit cleanly

**Why it’s important**

- Prevents forced mislabeling

- Gives you real data to evolve types later

- Reduces user friction

## Canonical Enum (Use This Everywhere)

```markdown
task_type:
  | 'pickup'
  | 'dropoff'
  | 'route'
  | 'help'
  | 'other'
```