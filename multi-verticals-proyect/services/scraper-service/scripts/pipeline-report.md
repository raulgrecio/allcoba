# Reporte de Análisis Real - Pipeline de Procesamiento de Imágenes

Generado automáticamente tras procesar imágenes reales descargadas de diversos portales en la carpeta `__data/storage/images`.

## Resumen Ejecutivo

| Métrica | Cantidad | Porcentaje |
| --- | --- | --- |
| **Total Imágenes Analizadas** | 41 | 100% |
| **Aceptadas (WebP normalizadas)** | 41 | 100.0% |
| **Rechazadas (Filtro temprano)** | 0 | 0.0% |
| **Con Información Inyectada (Watermarks/Metadatos)** | 7 | 17.1% |
| **Con Esteganografía Oculta (LSB)** | 0 | 0.0% |
| **Con Datos Sensibles (Teléfonos/Emails/GPS)** | 0 | 0.0% |

## Resultados Detallados de Inyección por Portal

A continuación se detalla qué marcas de agua visuales o firmas de metadatos invisibles se encontraron en cada portal:

| Portal | Imagen | Estado | Resolución | Inyección Detectada | Detalles |
| --- | --- | --- | --- | --- | --- |
| **bluemove** | `000.jpg` | 🟢 Aceptada | 600x1019 | Ninguna | - |
| **bluemove** | `001.jpg` | 🟢 Aceptada | 600x861 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'bluemove' detectado en los píxeles. |
| **bluemove** | `002.jpg` | 🟢 Aceptada | 600x807 | Ninguna | - |
| **bluemove** | `000.jpg` | 🟢 Aceptada | 600x800 | Ninguna | - |
| **bluemove** | `001.jpg` | 🟢 Aceptada | 600x800 | Ninguna | - |
| **bluemove** | `002.jpg` | 🟢 Aceptada | 600x800 | Ninguna | - |
| **bluemove** | `003.jpg` | 🟢 Aceptada | 600x995 | Ninguna | - |
| **bluemove** | `004.jpg` | 🟢 Aceptada | 600x800 | Ninguna | - |
| **bluemove** | `005.jpg` | 🟢 Aceptada | 600x900 | Ninguna | - |
| **bluemove** | `006.jpg` | 🟢 Aceptada | 600x399 | Ninguna | - |
| **bluemove** | `007.jpg` | 🟢 Aceptada | 600x800 | Ninguna | - |
| **bluemove** | `008.jpg` | 🟢 Aceptada | 600x399 | Ninguna | - |
| **bluemove** | `009.jpg` | 🟢 Aceptada | 600x893 | Ninguna | - |
| **bluemove** | `010.jpg` | 🟢 Aceptada | 600x758 | Ninguna | - |
| **chicasmalas** | `000.jpg` | 🟢 Aceptada | 444x189 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'chicasmalas' detectado en los píxeles. |
| **chicasmalas** | `001.jpg` | 🟢 Aceptada | 1024x683 | Ninguna | - |
| **chicasmalas** | `002.jpg` | 🟢 Aceptada | 1024x1024 | Ninguna | - |
| **chicasmalas** | `003.jpg` | 🟢 Aceptada | 1536x1024 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'chicasmalas' detectado en los píxeles. |
| **chicasmalas** | `004.jpg` | 🟢 Aceptada | 1536x1024 | `ocr_watermark_brand`, `url_matched` | Firma visible de portal/imagotipo verbal de 'chicasmalas' detectado en los píxeles.; Marca de agua con URL detectada en los píxeles: chicasmalas.es. |
| **chicasmalas** | `005.jpg` | 🟢 Aceptada | 1647x1098 | Ninguna | - |
| **chicasmalas** | `006.jpg` | 🟢 Aceptada | 424x512 | Ninguna | - |
| **chicasmalas** | `007.jpg` | 🟢 Aceptada | 800x1164 | Ninguna | - |
| **chicasmalas** | `008.jpg` | 🟢 Aceptada | 928x1010 | Ninguna | - |
| **chicasmalas** | `009.jpg` | 🟢 Aceptada | 1378x1918 | Ninguna | - |
| **chicasmalas** | `010.jpg` | 🟢 Aceptada | 1024x1536 | Ninguna | - |
| **chicasmalas** | `011.jpg` | 🟢 Aceptada | 900x1600 | Ninguna | - |
| **chicasmalas** | `012.jpg` | 🟢 Aceptada | 512x640 | Ninguna | - |
| **chicasmalas** | `013.jpg` | 🟢 Aceptada | 1080x1620 | Ninguna | - |
| **citapasion** | `000.jpg` | 🟢 Aceptada | 800x1066 | Ninguna | - |
| **citapasion** | `001.jpg` | 🟢 Aceptada | 800x1375 | Ninguna | - |
| **ardienteplacer** | `000.jpg` | 🟢 Aceptada | 432x768 | Ninguna | - |
| **ardienteplacer** | `001.jpg` | 🟢 Aceptada | 512x768 | Ninguna | - |
| **ardienteplacer** | `002.jpg` | 🟢 Aceptada | 512x768 | Ninguna | - |
| **ardienteplacer** | `003.jpg` | 🟢 Aceptada | 512x768 | Ninguna | - |
| **ardienteplacer** | `004.jpg` | 🟢 Aceptada | 560x768 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'ardienteplacer' detectado en los píxeles. |
| **erosguia** | `000.jpg` | 🟢 Aceptada | 590x880 | Ninguna | - |
| **erosguia** | `001.jpg` | 🟢 Aceptada | 590x880 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'ErosGuia' detectado en los píxeles. |
| **erosguia** | `002.jpg` | 🟢 Aceptada | 590x880 | Ninguna | - |
| **erosguia** | `003.jpg` | 🟢 Aceptada | 590x880 | Ninguna | - |
| **erosguia** | `004.jpg` | 🟢 Aceptada | 590x880 | `ocr_watermark_brand` | Firma visible de portal/imagotipo verbal de 'ErosGuia' detectado en los píxeles. |
| **erosguia** | `002.jpg` | 🟢 Aceptada | 590x880 | Ninguna | - |


## Análisis de Esteganografía LSB y OCR

Detalle de las cadenas y textos extraídos de las imágenes aprobadas:

| Portal | Imagen | Texto OCR (Primeras 80 letras) | Esteganografía LSB Oculta | Datos Sensibles |
| --- | --- | --- | --- | --- |
| **bluemove** | `000.jpg` | `- | e a ¢ 0 | 7 ) N - —~ 1 É ad y » (e | wv fee —— | y Y =  ———_ ——— i Ne. L = —`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `001.jpg` | `\ \ = NN ) 1 — MEN A. [a / i | | i í FS | | LUE I 0 Y 3 4 4 | p “ vw ai © : : Q `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `002.jpg` | `i 1 ¥ E J \ == . f y i y E *- | 1 =, : oF Pr. JN y |. SE ai | 7 pe i N PA , ) /L`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `000.jpg` | `[ & 4 ay bl E y ww  3 Lg `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `001.jpg` | `| » | 2 rr 18 ) /  Pal ( `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `002.jpg` | `- y L iu Ma | / du a > N r i - r Mod  | : ww. J `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `003.jpg` | `— a io, r4 | WE BY y p y —— AR + EN - ) a | el 1 Q \ \ \ A X a 4 y | M ) 4 3 J 1`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `004.jpg` | `ot J | nit | E | | A ‘Ra  Nal YY ia `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `005.jpg` | `Y | | - MA E Se > NA - 3 y ir 4 UL 10 i By eA EN \ Za | > - le le A < of y \ « .`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `006.jpg` | `Aa NY Be A ef. Ni 7 » a » 4 =n Ee A — | vil hi Sa ' / NG ¢ E un  b 1 -_— . - \ B`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `007.jpg` | `\ a - | EL | 3 = — —_Y 7 Be <A — NS  `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `008.jpg` | `ez dl == ya Sm 7 ee id , : >  Ya iM `... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `009.jpg` | `* | ), | | 4 ’ a f 1k 1 » " \ . Y r A | L BEET | Ly “e "ml aE NN Aj "8 Ci “ Lh L`... | *Limpio (ruido)* | Ninguno |
| **bluemove** | `010.jpg` | `E « AÑ | a | 1 r ’ Y | J “ e | po 4  . 4 \ J : J `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `000.jpg` | `CHICASMAJASES  TTT `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `001.jpg` | `AY, rigs  \ MM .  | v »” Eróticos ¡ e UC hy - - SEE 4 a a  7 ~~ En `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `002.jpg` | `os CASTILLA Y x  y \ y EQCOAHADTC | `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `003.jpg` | `SN  » Masajes , A Erótico gi + + = cicasmalas.s á a | - ad ” | a  ==, .~w PS PHr`... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `004.jpg` | `) e of - 1 y \ if 22, - - 4 ) 24 . * - A Y ° asajes \) LJ | A <rólicos «a - . n'`... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `005.jpg` | `ho a =_— A ¡e = ow ay | LN r - -“  {. _ `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `006.jpg` | `sá i » { 3  I | J () `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `007.jpg` | `—N & | (AR  N \ ( ASA \ 4 `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `008.jpg` | `2  nl I NN `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `009.jpg` | `- Wu » | Y a | - O | & = a  4 \ A | \N  % 4 `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `010.jpg` | `' \ \ ) » UY g 1 “ J | OZ i UA X A Da | ANO i A e Az sl E FOR. N f E 1. a | | a `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `011.jpg` | `» Pa | « E ) a » | Pe EEN &F a “ue Ne \ / 73%0 2 ' y 0! 11 e. y . E. e AN ou NX `... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `012.jpg` | `os S pi Ea 7 y " 3 ta = Ma «U - > h y % - Me De ia 3 0) 179 oe LA aR { i ora g 5`... | *Limpio (ruido)* | Ninguno |
| **chicasmalas** | `013.jpg` | `CS — u -— “ 4 > ' ¢ ” - — “ E, 3 : A  Co yg a. `... | *Limpio (ruido)* | Ninguno |
| **citapasion** | `000.jpg` | `A UNS NN PENN TE. NN 7 Ty + k 3 s S E e i See Paro, \ a) we LA UE y - . - Ma por`... | *Limpio (ruido)* | Ninguno |
| **citapasion** | `001.jpg` | `4 7 > M E > - - 9° vr : 3 N : e Á oS v D 7 : 1 => - -  ~ | | < - | | 7 > ~ p Tom`... | *Limpio (ruido)* | Ninguno |
| **ardienteplacer** | `000.jpg` | `EN aroie LS co  ela) ardie .2 £0 9 `... | *Limpio (ruido)* | Ninguno |
| **ardienteplacer** | `001.jpg` | `. a LA” de - , p / ), 2 E A e .. |v L . > A = E 4 ó 1 [4 ; HAs  4a vy a { NN wu `... | *Limpio (ruido)* | Ninguno |
| **ardienteplacer** | `002.jpg` | `1 a | | N a \ ia e | 1 2 DET Ko - JUN ’ MN Rs y [| oe E A , EE e oR > {far SRS A`... | *Limpio (ruido)* | Ninguno |
| **ardienteplacer** | `003.jpg` | `Y N = 8  AEE), pr `... | *Limpio (ruido)* | Ninguno |
| **ardienteplacer** | `004.jpg` | `— > a | i» \ ardie nie a om ) : 7 E - / A Y | (| A | Y N\A N Wy N  y. Xy `... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `000.jpg` | `| 5 : | f A | a u NN | py » y N Va | | 4 — | =  1 = BAA ! NN EE Bi Ok `... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `001.jpg` | `4 i kL f wn Bee E oo > | y am CN ' \ q 21 a | | ' - y - / y LA. 7  U y \ » | ~ .`... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `002.jpg` | `J ® | | ÍA : fd A A f. 4 " ! >“ E i Willi E bof | - N == a of . N 2). (e) @ 0) e`... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `003.jpg` | `a ' r EH e ® i Te | a E y | ". | V año | | N * 1. I os | “e ! y Lo w a j Y - ul `... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `004.jpg` | `\ 1. y “o | i “= E | orosyLia ear 3 y \ o | | hE  Le A | SEA J) `... | *Limpio (ruido)* | Ninguno |
| **erosguia** | `002.jpg` | `7] E y / wr ra wr o -“- E ) | gy. 1 q 3 » l E \ ! VE 1 u | > A ) \ Co as w 3 E y`... | *Limpio (ruido)* | Ninguno |
