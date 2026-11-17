# Fixed-frame, hinged-counterweight trebuchet model

**Human review: pending.** This reference can inform the mechanism issue before that review; it is not a reviewed construction or safety specification.

## Sources

Numbered citations below identify what was actually read. Page numbers are the printed PDF pages, not search-result positions. Search metadata alone is not evidence for an equation or a measurement.

1. <a id="s1"></a> **E. Horsdal (2023)**, *The swinging counterweight trebuchet. On scaling and optimization*, arXiv preprint, **v1**. [DOI](https://doi.org/10.48550/arXiv.2303.01306); [read PDF](https://arxiv.org/pdf/2303.01306v1). Read especially pp. 2–4 (geometry), Table 1 p. 11, Table 2 p. 13, Appendix A p. 18 (all three mechanical phases). These are theoretical designs, not historical measurements.
2. <a id="s2"></a> **Erik Horsdal, Filip Drejer Johnsen and Jonas Rasmussen (2025)**, *The swinging counterweight trebuchet. Experiments on inner movement and ranges*, arXiv preprint, **v2**. [DOI](https://doi.org/10.48550/arXiv.2502.19442); [read PDF](https://arxiv.org/pdf/2502.19442v2). Read §§2.1–2.5, Table 1 p. 6, Table 2 p. 8, §§3.5–3.7 and Table 3 p. 16, Appendix B pp. 21–22. Distinguishes measured field ranges, ranges inferred from angular measurements, and lossless calculations.
3. <a id="s3"></a> **Douglas Cline (2021 page revision)**, “6.3: Lagrange Equations from d’Alembert’s Principle,” *Variational Principles in Classical Mechanics*, University of Rochester / Physics LibreTexts. [Read chapter](https://phys.libretexts.org/Bookshelves/Classical_Mechanics/Variational_Principles_in_Classical_Mechanics_(Cline)/06%3A_Lagrangian_Dynamics/6.03%3A_Lagrange_Equations_from_dAlemberts_Principle), especially equations 6.30 (generalized force), 6.43 and 6.45 (Lagrangian and equations with excluded forces).
4. <a id="s4"></a> **William Moebs, Samuel J. Ling and Jeff Sanny (2016)**, “6.2 Friction,” *University Physics Volume 1*, OpenStax / Rice University. [Read section](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction), equations 6.1–6.2, Table 6.1 and the discussion of the limits of this empirical law.
5. <a id="s5"></a> **Wikipedia contributors (2026, accessed 2026-11-17)**, “Friction,” *Wikipedia*, table “Approximate coefficients of friction.” [Read revision](https://en.wikipedia.org/w/index.php?title=Friction&oldid=1384795959). Used only as a **secondary, illustrative material-coefficient compilation**, not trebuchet calibration. The dry wood-on-wood kinetic interval is attributed there to Richard T. Barrett, *Fastener Design Manual*, NASA RP-1228 (1990), p. 16; that primary report was not accessible in this run.
6. <a id="s6"></a> **NIST (2022 CODATA edition)**, “standard acceleration of gravitation,” *NIST Reference on Constants, Units, and Uncertainty*. [Read value](https://physics.nist.gov/cgi-bin/cuu/Value?gn). A conventional gravity value, not a measurement of the experimental site.

**Lead checks:** Mark Denny, “Siege engine dynamics,” *European Journal of Physics* **26** (2005), 561, [DOI](https://doi.org/10.1088/0143-0807/26/4/002), was located and its publisher metadata read, but its full text was not used. The Siano “Trebuchet Mechanics” lead did not yield readable full text (the attempted host timed out). No claims below are attributed to an unread Siano or Denny equation.

**Search provenance:** [rforge/provenance.json](rforge/provenance.json) and [retrieval notes](rforge/README.md). Standard-depth initial and focused searches used OpenAlex and Crossref; a reference expansion used OpenAlex. This is a bounded engineering literature search, not an exhaustive systematic review.

## Symbols

All angles in the equations are **absolute, counterclockwise from positive horizontal**, unlike the angle conventions in [1, 2]. The frame is inertial; the pivot is fixed. A dot means differentiation with respect to physical time, not the scaled time in [1, Appendix A]. Symbols introduced here are definitions for the Derived model below.

| Symbol | Meaning | SI unit |
| --- | --- | --- |
| $t,t_r,\Delta t$ | Time, release time, elapsed time after release | s |
| $x,y;\dot x,\dot y$ | Projectile-centre position and velocity | m; m s⁻¹ |
| $\theta,\psi;\dot\theta,\dot\psi$ | Beam long-end angle, hanger-to-counterweight angle; angular velocities | rad; rad s⁻¹ |
| $\phi$ | Absolute tip-to-projectile sling angle, recoverable from its unit vector | rad |
| $a,b,c,s$ | Pivot-to-long-tip, pivot-to-hinge, hinge-to-counterweight-centre, effective sling length | m |
| $h,y_t,y_g$ | Pivot height, horizontal trough centre-path height, target centre-path height | m |
| $d$ | Signed beam centre-of-mass distance along the long-end direction | m |
| $D$ | Beam diameter in published cylindrical-beam presets | m |
| $M,m,m_b$ | Counterweight, projectile plus effective carried load, beam masses | kg |
| $I_b$ | Beam moment of inertia **about pivot**, not about its centre | kg m² |
| $g$ | Gravitational acceleration magnitude | m s⁻² |
| $\mathbf O,\mathbf B,\mathbf H,\mathbf C,\mathbf W,\mathbf r$ | Pivot, sling attachment, hinge, beam centre, counterweight centre, projectile position vectors | m |
| $\mathbf e(\cdot),\mathbf e_\perp(\cdot),\mathbf e_y,\mathbf u,\mathbf p$ | Unit direction, its angular derivative, vertical unit vector, sling direction, directed pin-exit tangent | 1 |
| $\mathbf v_{rel},\delta$ | Projectile velocity relative to tip; beam-minus-hanger angle | m s⁻¹; rad |
| $S,N,F_t,\mathbf R$ | Sling tension, trough normal reaction, signed horizontal trough friction, pivot support reaction | N |
| $R_a,\tau_a$ | Effective axle journal radius, signed axle-friction torque | m; N m |
| $\mu_a,\mu_{a,s},\mu_t,\mu_{t,s}$ | Kinetic/static axle and trough coefficients | 1 |
| $\alpha,z$ | Pin tangent angle relative to beam; release-event scalar | rad; 1 |
| $T,V,\mathcal L,E,\Delta U$ | Kinetic, potential, Lagrangian, total mechanical, invested potential energy | J |
| $q_j,Q_j$ | Generalized coordinate and associated nonconservative generalized force | rad or m; N m or N |
| $x_r,y_r,v_{xr},v_{yr},v_r,A,t_f,R,K_g,\eta$ | Release position, velocity components, speed, climb above targetward horizontal, flight duration, pivot-to-impact range, impact kinetic energy, efficiency | m, m, m s⁻¹, m s⁻¹, m s⁻¹, rad, s, m, J, 1 |
| $\rho_a,C_D,A_p,\mathbf v$ | Air density, drag coefficient, projectile frontal area, air-relative velocity (still air below) | kg m⁻³; 1; m²; m s⁻¹ |
| $L_1,L_2,L_3,L_4,L_b,H,L_{CM},F,\theta_i$ | Source notation: long arm, short arm, hanger, sling, total beam length, pivot height, beam centre offset, clearance factor, initial beam angle from downward vertical | m except $F$ (1), $\theta_i$ (rad) |

State while attached: beam/hanger angles and their velocities, projectile position and velocity, subject to the sling constraint and (in the trough) the height constraint. Tension and normal force are algebraic unknowns, not extra integrated states. After release the projectile and the remaining machine evolve separately.

## Equations of motion

### Assumptions and construction

**Derived throughout this section** from [3, equations 6.30, 6.43, 6.45] and Newtonian mechanics as used in [1, §2 and Appendix A; 2, §§2.3–2.5]. Assumptions: planar rigid beam, fixed pivot, point counterweight on a massless rigid hanger, massless inextensible taut sling with coincident attachments at its effective tip, point projectile, uniform gravity, horizontal trough. Beam inertia is an input. Hanger bearing friction, elastic deflection, sling/pouch inertia and pre-release air resistance are omitted. The two real sling cords are replaced by one effective length; [2, §2.1] discusses that approximation.

**Derived geometry** (vector addition; assumptions above; [1, Fig. 1; 2, equations 5 and counterweight geometry]):

$$
\begin{aligned}
\mathbf e(\beta)&=(\cos\beta,\sin\beta),&
\mathbf e_\perp(\beta)&=(-\sin\beta,\cos\beta),&\mathbf e_y&=(0,1),\\
\mathbf O&=(0,h),&\mathbf B&=\mathbf O+a\mathbf e(\theta),&
\mathbf H&=\mathbf O-b\mathbf e(\theta),\\
\mathbf C&=\mathbf O+d\mathbf e(\theta),&
\mathbf W&=\mathbf H+c\mathbf e(\psi),&\mathbf r&=(x,y),\\
\mathbf u&=(\mathbf r-\mathbf B)/s=(\cos\phi,\sin\phi),&
|\mathbf r-\mathbf B|^2&=s^2,&\delta&=\theta-\psi.
\end{aligned}
\tag{1}
$$

Here $\beta$ is merely the argument of the unit-vector function, in radians. The sling pulls the projectile toward the tip, hence its force on the projectile is opposite $\mathbf u$.

**Derived energies and principle** ([3, equations 6.43, 6.45]; point-mass/rigid-body energy construction in [1, §2]):

$$
\begin{aligned}
T&=\tfrac12 I_b\dot\theta^2+\tfrac12 M|\dot{\mathbf W}|^2+\tfrac12 m|\dot{\mathbf r}|^2,\\
V&=g(m_b C_y+M W_y+m y),\qquad \mathcal L=T-V,\\
\frac{d}{dt}\frac{\partial\mathcal L}{\partial\dot q_j}
-\frac{\partial\mathcal L}{\partial q_j}&=Q_j.
\end{aligned}
\tag{2}
$$

There is **no additional beam translational kinetic term**: pivot inertia already includes it. This avoids double-counting when supplying a measured inertia such as [2, Table 1]. Enforce the sling constraint with tension; virtual work at the tip gives its beam torque. Expanding (2) for beam and hanger, and using the projectile force balance, gives the following **Derived dimensional equations**, valid in both attached phases ([3]; compare [1, Appendix A] after changing angle conventions):

$$
\begin{aligned}
(I_b+Mb^2)\ddot\theta
-Mbc\cos\delta\,\ddot\psi
-Mbc\sin\delta\,\dot\psi^2
+g(m_bd-Mb)\cos\theta
&=aS\,\mathbf e_\perp(\theta)\!\cdot\!\mathbf u+\tau_a,\\
Mc^2\ddot\psi-Mbc\cos\delta\,\ddot\theta
+Mbc\sin\delta\,\dot\theta^2+Mgc\cos\psi&=0,\\
m\ddot x&=-S u_x+F_t,\\
m\ddot y&=-S u_y-mg+N.
\end{aligned}
\tag{3}
$$

These are a constrained system, not four independent angular equations. To close it, differentiate the sling-length constraint twice. **Derived** from (1) at constant length ([3, holonomic-constraint discussion]):

$$
\begin{aligned}
\mathbf v_{rel}&=\dot{\mathbf r}-\dot{\mathbf B},\\
\ddot{\mathbf B}&=a\bigl[\mathbf e_\perp(\theta)\ddot\theta
-\mathbf e(\theta)\dot\theta^2\bigr],\\
\mathbf u\cdot(\ddot{\mathbf r}-\ddot{\mathbf B})
&=-|\mathbf v_{rel}|^2/s.
\end{aligned}
\tag{4}
$$

Use both position and velocity consistency, not just (4), to prevent constraint drift. A negative solved tension means the assumed taut-sling model has failed; do not allow a rope to push. Slack-sling motion is outside this reference and must be reported, not silently interpreted as pin release.

### (a) Projectile sliding along the trough

**Derived contact specialization**, horizontal unilateral contact ([4, §6.2] and [1, §2, Appendix A.1]):

$$
y=y_t,\quad \dot y=\ddot y=0,\qquad
N=mg+S u_y\geq0.
\tag{5}
$$

Solve (3)–(5) simultaneously for beam/hanger accelerations, horizontal projectile acceleration, tension and normal reaction, with the trough-friction law below. This leaves two mechanical degrees of freedom. At rest the static-friction branch must be checked before assuming sliding. Lift-off occurs when the required supporting reaction reaches zero and would become negative on continued constrained motion, **not** when a guessed beam angle is reached [1, §2]. Position and velocity remain continuous into phase (b). At a grazing zero without separation, retain contact.

### (b) Sling swinging free

**Derived free-sling specialization** ([1, Appendix A.2]; force balance and assumptions above):

$$
N=0,\qquad F_t=0.
\tag{6}
$$

Solve (3), (4), (6) for four accelerations and tension. The one length constraint leaves three degrees of freedom (beam, hanger and sling). Integrate until the release event below. If the projectile strikes the trough again, this smooth phase model no longer applies; an impact/contact rule is a separate modelling gap.

### (c) After release

**Derived separation**, ideal instantaneous opening without impulse ([1, Appendix A.3; 2, Appendix B.1]): remove the sling constraint and set tension to zero. The first two equations of (3), with no sling torque, remain the beam/hanger equations. The projectile inherits its instantaneous position and velocity, **including moving-tip velocity**. In vacuum its trajectory and flight time to a lower target level follow by integrating constant gravity:

$$
\begin{aligned}
S&=0,\quad N=F_t=0,\\
x(t_r+\Delta t)&=x_r+v_{xr}\Delta t,\\
y(t_r+\Delta t)&=y_r+v_{yr}\Delta t-\tfrac12g\Delta t^2,\\
t_f&=\frac{v_{yr}+\sqrt{v_{yr}^2+2g(y_r-y_g)}}{g}.
\end{aligned}
\tag{7}
$$

For the published cases the target is toward negative horizontal and range is measured from the pivot, not from the launch point. **Derived observables**, equivalent to [2, Appendix B.1 and §2.5], for that direction and a target at trough level:

$$
\begin{aligned}
R&=-x_r-v_{xr}t_f,\qquad v_r=\sqrt{v_{xr}^2+v_{yr}^2},\\
A&=\operatorname{atan2}(v_{yr},-v_{xr}),\\
K_g&=\tfrac12 m v_r^2+mg(y_r-y_g),\\
\Delta U&=(Mb-m_bd)g(1+\cos\theta_i),\qquad \eta=K_g/\Delta U.
\end{aligned}
\tag{8}
$$

The invested-energy expression assumes the source initial pose (vertical hanging counterweight, horizontal sling, machine initially at rest) and final rest with the long arm up and counterweight down [1, equation 3; 2, equation 4]. This efficiency includes potential energy at release; it is not just release kinetic energy divided by the counterweight's partial drop.

If flight drag is enabled, use the **cited** quadratic-force model in [2, Appendix B.2, equation B.2], rather than the vacuum flight-time formula:

$$
m\ddot{\mathbf r}=-mg\mathbf e_y-\tfrac12\rho_a C_D A_p|\mathbf v|\mathbf v.
\tag{9}
$$

Assumptions: still air, constant density and drag coefficient, no lift/spin, frontal area known. Do not apply the paper's small-loss perturbation formula as an exact drag solver.

## Release condition

[2, §2.1, Figs. 2–3] describes a ring on an adjustable semicircular spigot: in the ideal description it leaves when the sling is perpendicular to the spigot. Neither [1] nor [2] supplies a universal straight-pin, finite-ring dynamics model. In particular, [1, §5] selects a virtual release time by optimization rather than simulating a pin.

**Derived ideal geometric event** from the perpendicularity construction in [2, §2.1] and the tension-force direction in (3). Assumptions: smooth ring already at the pin exit, negligible ring/pouch mass and release delay, taut sling, directed exit tangent fixed relative to the beam. Define the directed tangent so that the retaining side has a negative sling projection and the opening side has a positive projection:

$$
\mathbf p=\mathbf e(\theta+\alpha),\qquad
z=\mathbf u\cdot\mathbf p=\cos(\phi-\theta-\alpha).
\tag{10}
$$

Release at the **first negative-to-positive zero crossing** during the intended free-sling swing, with positive tension. This direction check selects one of the two perpendicular orientations. Thus changing the pin angle changes the root time, not the projectile's prescribed launch angle. A drawing/measurement must establish the directed tangent and its sign; an unoriented pin line alone cannot specify the event. A pose already on the opening side at arming is invalid for this event convention, not a reason to wait for another revolution.

[2, §3.7, Table 3] explicitly reports that field pin settings differ from predicted settings. The authors estimate a release delay of approximately **20 ms** from the angular discrepancy and sling speed. This is evidence **against** treating (10) as an experimentally exact release law. The source's spigot angle is measured in its own drawing; do not copy it directly into $\alpha$ without converting the geometry. A calibrated angle or a separately measured delay is needed for a real-machine shot preset. No delay value is assumed in the lossless reference case.

## Friction models

### Main axle

**Derived signed journal torque** from Coulomb friction [4, equations 6.1–6.2] and the measured-bearing power model [2, §3.5, equation 8]. Assumptions: sliding journal with an effective radius, load represented by the magnitude of the total support reaction, no viscous term. The support reaction follows from the total external force balance; stationary-frame trough forces must not be mistaken for pivot load:

$$
\begin{aligned}
\mathbf R&=m_b\ddot{\mathbf C}+M\ddot{\mathbf W}+m\ddot{\mathbf r}
+(m_b+M+m)g\mathbf e_y-(F_t,N),\\
\tau_a&=-\mu_a R_a|\mathbf R|\operatorname{sgn}(\dot\theta)
\quad(\dot\theta\ne0),\\
|\tau_a|&\leq\mu_{a,s}R_a|\mathbf R|\quad(\dot\theta=0).
\end{aligned}
\tag{11}
$$

At rest choose the static torque required to hold if it fits the bound; otherwise start slipping in the unbalanced-torque direction. Solve the load-dependent law together with the accelerations, rather than inserting a fixed counterweight load. After release omit the projectile and trough terms from the reaction calculation. The dissipation is torque times angular speed with the opposite sign; the kinetic branch always removes energy [2, equation 8]. This is not a rolling-ball-bearing torque law.

**Typical illustrative kinetic coefficient envelope:** **0.03–0.35**, spanning oiled steel-on-steel (**0.03**) and dry steel/wood examples (**0.30**) in [4, Table 6.1], and the fitted **0.35** used for the experimental journal/hinge losses in [2, Fig. 18]. This is an envelope over different surfaces, not uncertainty on one material pair. [2] uses an axle radius of **0.017 m** and hinge radius of **0.0025 m** (Fig. 18). Only the axle model is specified here; do not absorb hinge friction into it and then count that loss again.

### Projectile–trough sliding

**Derived signed sliding law** from [4, equations 6.1–6.2], applied to the normal force solved in (5). Assumptions: horizontal trough, sliding without rolling, effective projectile/pouch contact represented by one Coulomb coefficient:

$$
\begin{aligned}
F_t&=-\mu_t N\operatorname{sgn}(\dot x)\quad(\dot x\ne0),\\
|F_t|&\leq\mu_{t,s}N\quad(\dot x=0).
\end{aligned}
\tag{12}
$$

Use the admissible static force to hold at rest; if no such force exists, transition to the kinetic branch. Friction disappears at lift-off. In particular the normal force is **not generally the projectile weight**, because sling tension has a vertical component.

**Typical material-surrogate range:** dry wood-on-wood kinetic **0.32–0.48** in [5, coefficient table]; [4, Table 6.1] instead gives an approximate **0.30**, with static **0.50**, for wood-on-wood and metal-on-wood. These numbers support a rough sliding-shoe/wooden-trough study, **not a calibrated stone, leather pouch, or fabric-on-wood coefficient**. The precise contacting material, moisture, and whether the load actually rolls must be measured. No read trebuchet source supplied a measured trough-sliding coefficient; the lossless reference disables it rather than assigning a guessed value. The secondary origin of the interval is a human-review item.

## Reference cases

### Lossless complete-machine benchmark: experimental geometry, published computed range

Use the **theoretical** vacuum result in [2, Table 3, p. 16], not its field or semi-empirical rows. All dimensional inputs below come from [2, Table 1, p. 6], except the projectile mass from Table 3 and gravity from [6]. The source explicitly says its theoretical calculation ignores internal friction and aerodynamic losses during acceleration [2, §3.7].

| Input | Value in SI | Provenance |
| --- | --- | --- |
| Long arm $a$, short arm $b$, hanger $c$, sling $s$ | 0.975 m; 0.250 m; 0.515 m; 0.870 m | [2, Table 1], centimetres converted to metres |
| Counterweight $M$, beam $m_b$, projectile $m$ | 53.9 kg; 4.86 kg; 0.717 kg | [2, Tables 1, 3]; counterweight includes moving support |
| Beam centre $d$, pivot inertia $I_b$ | 0.465 m; 1.85 kg m² | [2, Table 1]; reported inertia uncertainty ±0.15 kg m² |
| Initial source beam angle $\theta_i$ | 0.55 rad | [2, Table 1] |
| Published pivot height $h$ | 0.831 m (rounded) | [2, Table 1] |
| Gravity $g$ | 9.80665 m s⁻² | [6], conventional test input; source site gravity is unspecified |

**Derived exact initialization** from that table, source geometry [2, Fig. 1], and (1): choose the trough/target centre paths as the height datum, use the source horizontal sling pointing left and vertical hanging counterweight, and normalize pivot height to remove table rounding:

$$
\begin{aligned}
y_t=y_g&=0,\quad h=a\cos(0.55)=0.831211\ldots\ {\rm m},\\
\theta(0)&=0.55-\pi/2,\quad \psi(0)=-\pi/2,\quad \phi(0)=\pi,\\
\mathbf r(0)&=(a\sin(0.55)-s,0),\\
\dot\theta(0)&=\dot\psi(0)=0,\quad\dot{\mathbf r}(0)=(0,0).
\end{aligned}
\tag{13}
$$

Disable axle, hanger and trough friction and all drag; this is a **lossless benchmark setting**, not measured zero friction. Massless sling/hanger, rigid beam and no release impulse are the model assumptions above, consistent with the theoretical comparison [1, §2; 2, §3.7]. No other inertias or air parameters are required for this vacuum case.

**Release policy:** maximize pivot-to-impact vacuum range over virtual releases during the first free-sling shot toward negative horizontal, before any collision or slack-sling failure. This matches the “maximum ranges” calculation in [2, Table 3; §§2.5, 3.7]. Do not use a field pin angle or impose the semi-empirical release time. Pin angle is therefore **not an input to this particular benchmark**; once the optimum pose is found, its ideal pin setting can be inferred from (10).

**Published result:** maximum vacuum range **42.8 m** [2, Table 3, theoretical row with sling **0.87 m**, projectile **717 g**]. Proposed acceptance tolerance: **±5%**, or **±2.14 m** (Derived test policy: multiply that published range by the selected relative allowance). This is an engineering reproduction tolerance, **not a published confidence interval**. It accommodates rounded geometry, unspecified local gravity and the measured pivot-inertia uncertainty of approximately **8.1%** (Derived: **0.15/1.85** from [2, Table 1]); range sensitivity to that uncertainty is not established. Tightening it requires matching the authors' exact inertia and numerical inputs. Numerical step/event convergence must be substantially tighter than this physical-input allowance. Agreement with a field range instead of this computed row does not pass this lossless case.

### Independent flight-only cross-check from a measured-motion reconstruction

[2, Table 2, p. 8] gives release position **(0.76 m, 2.39 m)**, speed **18.6 m s⁻¹**, climb **39.5°** toward negative horizontal, projectile **0.717 kg**, and vacuum range **36.6 m**. This is a **semi-empirical reconstruction**, not an actual vacuum field measurement and not the complete-machine lossless result above. With gravity from [6] and target height at the source trough datum, these are the full inputs for phase (c); set horizontal velocity negative and vertical velocity positive using that speed/climb [2, Appendix B.1]. Equations (7)–(8) give **36.560 m** (Derived substitution of the cited rounded inputs). Proposed flight-only tolerance **±0.2 m** around the published **36.6 m** is a Derived rounding allowance for the tabulated release speed, angle and position, not a measurement error bar. This cross-check must not tune machine friction to compensate for a flight formula/sign error.

## Typical dimensions

These are **illustrative source-backed size classes**, not statistically typical historical engines. “Small” is a built experimental machine; “medium” and “large” are published computed designs. Every populated field below is either directly tabulated or explicitly Derived from the cited source's geometry. They are starting presets, not claims of historical fidelity or construction safety.

The source mapping is $a=L_1,b=L_2,c=L_3,s=L_4,h=H,d=L_{CM}$. **Derived completion rules** for the theoretical uniform thin cylindrical beam in [1, §2, pp. 3–4] (negligible transverse diameter contribution, massless hanger):

$$
h=a\cos\theta_i,\quad c=Fh-b,\quad d=(a-b)/2,\quad
I_b=\tfrac13m_b(a^2-ab+b^2),\quad a+b=L_b.
\tag{14}
$$

These rules must **not** replace measured centre/inertia for the experimental small machine.

| Field | Small: experimental | Medium: computed | Large: computed |
| --- | --- | --- | --- |
| Source | [2, Table 1 p. 6; Table 3 p. 16] | [1, Table 1 p. 11, reference $Z_0$ row with $F=2/3$] | [1, Table 2 p. 13, “Max Q” row with $\theta_i=30°$, $F=2/3$] |
| Long arm $a$ | 0.975 m [2, Table 1] | 3.97 m [1, Table 1] | ≈6.12 m, Derived: $5.30/\cos30°$ [1, Table 2; equation (14)] |
| Short arm $b$ | 0.250 m [2, Table 1] | 0.67 m [1, Table 1] | ≈0.94 m, Derived: total 7.06 m minus long arm [1, Table 2; (14)] |
| Hanger $c$ | 0.515 m [2, Table 1] | ≈1.62 m, Derived using clearance factor 2/3 [1, Table 1; (14)] | ≈2.59 m, Derived using clearance factor 2/3 [1, Table 2; (14)] |
| Sling $s$ | 0.870 m [2, Table 1] | 3.58 m [1, Table 1] | 5.57 m [1, Table 2] |
| Pivot height $h$ | 0.831 m, rounded [2, Table 1] | ≈3.44 m, Derived using initial 30° [1, Table 1; (14)] | 5.30 m [1, Table 2] |
| Counterweight $M$ | 53.9 kg [2, Table 1] | 2590 kg [1, Table 1] | 15700 kg, converted from 15.7 metric tons [1, Table 2] |
| Beam $m_b$ | 4.86 kg [2, Table 1] | 112 kg [1, Table 1] | 591 kg [1, Table 2] |
| Projectile $m$ | 0.717 kg [2, Table 3, theoretical comparison] | 20.7 kg [1, Table 1] | 101 kg [1, Table 2] |
| Beam diameter $D$ | 0.075 m [2, Table 4 p. 17] | 0.21 m [1, Table 1] | No tabulated value in this selected row [1, Table 2] |
| Initial source angle $\theta_i$ | 0.55 rad [2, Table 1] | 30° = $\pi/6$ rad [1, Table 1] | 30° = $\pi/6$ rad [1, Table 2] |
| Centre/inertia | 0.465 m; 1.85 kg m² [2, Table 1] | Derived uniform-beam values via (14) [1, §2] | Derived uniform-beam values via (14) [1, §2] |

For initialization convert the source beam angle to this document's horizontal convention as in (13); the counterweight hangs vertically, the initial sling is horizontal, and the system starts at rest [1, §2]. Reconcile rounded dimensions with the exact trough geometry, as for the reference case, rather than stretching the sling.

**Unset fields for the shot/preset issue:** no calibrated pin tangent angle, ring/pouch release delay, trough kinetic/static coefficients, or axle static coefficient is provided for any of these exact presets. The experimental kinetic-bearing fit and radius are available in [2, Fig. 18], but are not universal constants. Medium/large axle radii, bearing materials, and all hinge-loss parameters remain unset; their hanger lengths above are geometric derivations, **not measurements**. Large diameter is also unset. Projectile shape/area, air properties, pouch mass, rolling resistance and finite projectile radius are not supplied by these preset rows. The theoretical rows optimize virtual release, not a physical pin. The shot issue must explicitly source, measure or label tuning values for these fields; absence must not silently become a purported source default.

## Gaps

- **Human review remains pending**, including checking sign conventions, the secondary friction interval, tolerances and source transcription. No human approval is inferred from provenance validation.
- A measured case exists [2], but its release delay, pre-release losses and experimental uncertainty prevent presenting it as an exact validation of the ideal machine. The primary complete-machine benchmark is therefore a **published computed** case; the flight-only cross-check uses measured-motion reconstruction. The different result categories are not interchangeable.
- No read source determines a unique pin-angle law for all hooks. Equation (10) is an explicitly idealized Derived event. Ring size, pin curvature, cord/pouch inertia, release impulse, sliding hysteresis and measured delay are unresolved for the intended machine. [2, §3.7] documents the practical discrepancy.
- The main-axle Coulomb law has experimental precedent [2], but material/lubrication, load variation, static breakaway and rolling bearings need calibration. The trough interval is only a material surrogate and comes from a secondary compilation; no measured stone/pouch-on-trough coefficient was found in the read trebuchet sources. Do not confuse tabulated static coefficients with kinetic ones.
- Slack sling, recontact/impact, a projectile which rolls rather than slides, finite projectile/pouch size, massive hanger, beam flexibility and out-of-plane motion require additional models. Negative tension or impossible contact must be surfaced as an unsupported state, not clipped into an apparently valid shot.
- The reference tolerance is an explicit proposed engineering policy, not an author-supplied confidence interval. A sensitivity study and the authors' precise numerical inputs would permit a tighter full-machine regression. Source gravity is not specified; [6] supplies a reproducible convention.
- Preset class names are editorial labels. The theoretical medium/large dimensions and mass scaling in [1] are not measured distributions of medieval construction; even the historical dimensions discussed there are acknowledged as uncertain.
- Search depth was **standard**: each batch had caps of **10 query variants, 5 sources and 50 requests**. The initial batch used **2 requests**, found **16** unique records and stopped `completed`; the focused batch used **12 requests**, found **62** deduped records and stopped `completed`, without coverage saturation. One reference expansion added **4 edges** with its own request cap of **1**. See retained manifests/checkpoints; these counts measure discovery, not relevance or full-text validation. Search bundles intentionally omit raw responses/PDFs, so their archived engine receipts cannot be revalidated in full from the committed subset. The export is labelled `agent_reported`, not falsely `engine_verified`.
