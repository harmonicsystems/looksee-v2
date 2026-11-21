// Our day: words for the routines of a school day — arriving, lining up,
// asking for things, the five senses at lunch, math words and going home —
// asked for by the class's teacher (2026-11-18). Each word is drawn as its
// own picture (the fifth thing on its line, a name in public/pic/; pics.js),
// or, where there is none yet, as the device's own emoji. Watch presets can use
// a set as the words around a video (videos.js).
//
// One word per line: English, Spanish, the Spanish article (empty for a verb,
// an adjective or a phrase), the emoji, and its picture when it has one. Kept as text, like things.js,
// because lines of code cost more of the size budget. No commas inside a word.
//
// These lists are first drafts for the teacher to correct. The Spanish follows
// the rest of Looksee (Latin American, as heard in US classrooms) and has not
// been checked by a Spanish speaker. Directions are the familiar command
// (mira, siéntate), as a teacher says them. No word here is written "o/a":
// that form follows the child (Settings ▸ Spanish feelings), and these
// words describe food and things, not the child. Only emoji from 2020 or
// earlier (Emoji 13), since a word slide has no picture file to fall back on.

const set = (lines) =>
  lines.split('\n').map((line) => {
    const [label, es, art, emoji, pic] = line.split(',')
    return { label, es, art, emoji, pic }
  })

export const ROUTINE = {
  arrival: set(`hello,hola,,👋,wave
backpack,mochila,la,🎒,backpack
hang up,cuelga,,🧥,hang-up
wash hands,lávate las manos,,🧼,wash-hands
sit,siéntate,,🪑,sit
look,mira,,👀,look
listen,escucha,,👂,listen
quiet,silencio,,🤫,quiet
wait,espera,,⏳,wait
help,ayuda,,🙋,help`),
  lineUp: set(`line up,haz fila,,🚸,line-up
walk,camina,,🚶,walk
stop,alto,,🛑,stop
wait,espera,,⏳,wait
quiet hands,manos quietas,,✋
eyes forward,ojos al frente,,👀,eyes-forward
follow,sigue,,👣,follow
door,puerta,la,🚪,door
first,primero,,🥇,first
last,último,,🏁,last`),
  core: set(`I,yo,,🧒,me
want,quiero,,🤲,want
more,más,,➕,more
go,vamos,,🟢,go
stop,alto,,🛑,stop
like,me gusta,,👍,like
help,ayuda,,🙋,help
look,mira,,👀,look
again,otra vez,,🔁,again
not,no,,🚫,no
all done,terminé,,✅,all-done`),
  requesting: set(`I want,yo quiero,,🤲,want
please,por favor,,🙏,please
thank you,gracias,,💛,thank-you
more please,más por favor,,➕,more
help please,ayuda por favor,,🙋,help
open please,abre por favor,,📦,open
all done,terminé,,✅,all-done
eat,comer,,🍽️,eat
drink,beber,,🥤,drink
water,agua,el,💧,water
cup,vaso,el,🥛,cup
spoon,cuchara,la,🥄,spoon`),
  senses: set(`see,ver,,👁️,see
hear,oír,,👂,hear
smell,oler,,👃,smell
taste,probar,,👅,taste
touch,tocar,,✋,touch
sweet,dulce,,🍭,sweet
sour,ácido,,🍋,sour
salty,salado,,🧂,salty
crunchy,crujiente,,🥨,crunchy
soft,suave,,🧸,soft
hot,caliente,,🔥,hot
cold,frío,,🧊,cold`),
  mathWords: set(`count,contar,,🧮,count
number,número,el,🔢
how many?,¿cuántos?,,❓,how-many
more,más,,⬆️,more-than
less,menos,,⬇️,less
equal,igual,,⚖️,equal
add,sumar,,➕,add
take away,quitar,,➖,take-away
first,primero,,🥇,first
next,siguiente,,➡️,next
last,último,,🏁,last`),
  packUp: set(`jacket,chaqueta,la,🧥,jacket
hat,gorra,la,🧢,cap
gloves,guantes,los,🧤,gloves
backpack,mochila,la,🎒,backpack
folder,carpeta,la,📁,folder
lunchbox,lonchera,la,🍱,lunchbox
line up,haz fila,,🚸,line-up
bus,autobús,el,🚌,bus
car,carro,el,🚗,car
home,casa,,🏠,house
goodbye,adiós,,👋,goodbye`)
}
