# 3D Voronoi ruumis kauguse leidmine lähimast servast

P = <Px, Py, Pz> - punkt, millest otsime lähimat kaugust
Vp = <Vpx, Vpy, Vpz> - punktile P lähim Voronoi punkt

Naaber i:
    * Vi = <Vix, Viy, Viz> - Voronoi punkt
    * Ni = normalize(Vi - Vp) 
        * Mõlema punkti, Vp ja Vi ümber on Voronoi hulktahukad ja neil on ühine tahk, mis asub tasandil I. 
        * Tasand I asub mõlemast punktist sama kaugel ja selle normaalvektor on Ni.
    * Mi = 0.5*(Vp + Vi) - lähim punkt tasandil I punktidele Vp ja Vi.
    * Di = dot(Mi, Ni) - tasandi I kaugus koordinaatide alguspunktist.
        * Mi asemel võib olla mistahes punkt tasandil, tulemus on sama.

Naaber j: Vj, Nj, Mj, Dj

Voronoi hulktahukate Vp, Vi ja Vj vahele jääb serv. Leiame sirge, millel see serv asub. See sirge on defineeritud punktiga E ja sihivektoriga Ed.

Ed = cross(Ni, Nj)

Punkti E leidmiseks teeme kitsenduse, et see peab olema lähim punkt koordinaatide alguspunktile sellel sirgel. Saame võrrandisüsteemi:

dot(Ni, E) = Di (E asub samal tasandil mis Mi)
dot(Nj, E) = Dj (E asub samal tasandil mis Mj)
dot(Ed, E) = 0 (punkti E vektor koordinaatide alguspunktist ja sirge sihivektor peavad olema risti)

Selle võrrandisüsteemi saame lahendada Crameri valemitega.

Nüüd vaatame läbi kõik teised naabrid k (Vk, Nk, Mk ja Dk). Kõikide punktide X, mis asuvad punktile Vp lähemal kui punktile Vk, korral kehtib seos:

dot(Nk, X - Mk) <= 0

Leiame sellised punktid sirgel E. Täpsemalt öeldes leiame kauguse t, kui palju peame punktist E vektori Ed suunas liikuma, et jõuda punkti, kus me oleme lähemal punktile Vk kui Vp? Leiame minimaalse ja maksimaalse kauguse t_min ja t_max üle kõikide naabrite k.

Loe lisaks: https://en.wikipedia.org/wiki/Cyrus–Beck_algorithm

dot(Nk, E + t*Ed - Mk) <= 0
dot(Nk, E) + dot(Nk, t*Ed) - dot(Nk, Mk) <= 0
dot(Nk, E) + t*dot(Nk, Ed) - dot(Nk, Mk) <= 0
t*dot(Nk, Ed) <= dot(Nk, Mk) - dot(Nk, E)
t*dot(Nk, Ed) <= dot(Nk, Mk - E)

Tähistame:

t*A <= B
Kui A > 0, siis t <= B/A ja t_max = min(t_max, B/A)
Kui A < 0, siis, t >= B/A ja t_min = max(t_min, B/A)
Kui A = 0, siis on sirge E paralleelne tasandiga K.

Claude'i antud pseudokood kauguse leidmiseks lähimast Voronoi servast:

```
float voronoiEdgeDistance(vec3 P, int R = 2) {
    seeds = gatherSeeds(P, R);
    C = argmin_{s in seeds} distance(P, s);
    neighbors = seeds - { C };

    float best = +INF;

    for (i = 0; i < neighbors.size; i++) {
        ni = normalize(neighbors[i] - C);
        mi = 0.5 * (neighbors[i] + C);

        for (j = i+1; j < neighbors.size; j++) {
            nj = normalize(neighbors[j] - C);
            mj = 0.5 * (neighbors[j] + C);

            dir = cross(ni, nj);
            if (length(dir) < EPS) continue;   // parallel bisectors, no edge

            Q0 = planePlaneIntersectionPoint(ni, mi, nj, mj, dir); // see note below
            dir = normalize(dir);

            // Clip the line by every other neighbor's half-space
            tmin = -INF; tmax = +INF;
            bool valid = true;

            for (k = 0; k < neighbors.size; k++) {
                if (k == i || k == j) continue;
                nk = normalize(neighbors[k] - C);
                mk = 0.5 * (neighbors[k] + C);

                denom = dot(nk, dir);
                num   = dot(nk, mk - Q0);

                if (abs(denom) < EPS) {
                    if (dot(nk, Q0 - mk) > 0) { valid = false; break; } // whole line excluded
                    continue;
                }
                t_bound = num / denom;
                if (denom > 0) tmax = min(tmax, t_bound);
                else            tmin = max(tmin, t_bound);
                if (tmin > tmax) { valid = false; break; }
            }

            if (!valid) continue; // this plane pair doesn't survive as a real edge

            // closest point on the true edge segment to P
            t  = clamp(dot(P - Q0, dir), tmin, tmax);
            pt = Q0 + t * dir;
            best = min(best, length(P - pt));
        }
    }
    return best;
}
```
