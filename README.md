JSProve
=======
JSProve is a web-based peal proving program for even bell methods (single methods and spliced) from Minor to Maximus.

## Features
* Load methods in from the MicroSiril Libraries (or specify new methods yourself)
* Shorthand generator for single methods
* All the work checker and change of method counter
* Detailed music output
* Music can be specified, if the particular row or row type is not already included by JSProve

## Usage
### Getting JSProve
Either visit http://james.theholdsworths.org.uk/projects/jsprove/ for a hosted version, or download this source code as a Zip file (from the link above) and open 'index.html' in your favourite browser (NOT Internet Explorer please!).

### Proving a Single Method
On the 'Methods and Composition' tab:

1. Remove any existing methods declared (the default ones are Bristol, Cambridge and Yorkshire respectively)
1. Select the stage (i.e. Minor/Major/Royal/Maximus)
1. Select the class (i.e. Surprise/Delight etc.)
1. Click 'Load Method from Library' and find the method you want (hint: just start typing the name and it should appear)

OK, now you're all set to start proving. Notice that the method you have selected will have been given a symbol (most likely its initial; e.g B for Bristol, C for Cambridge etc).

1. In the 'Shorthand' box start typing some calls in (hhh is defined for you - click 'Generate' and see what it does...)

I'll leave you to play with that for a bit. Note that you can manually tinker withe the composition in the main box below. Indeed, that's how you will need to prove spliced, which leads me nicely on to...

### Proving Spliced

### Specifying your own music
JSProve will, by default, tell you all the 4-bell runs contained in the composition (both off the front and at the back) in a format like:

```
16:  6543****
24:  ****3456
18:  ****8765
```

as well as telling you if you've acheived some well-known changes (if it's an 8-bell composition), i.e. Backrounds, Queens, Kings, Tittums and Whittingtons.

Of course, you will want to specify your own tastes in music, rather than just settle with my own; so if, for example, you like CRU's, then we'd best get them added for you...

1. Click the Music tab
2. Start adding music patterns (one per line) in the box. As the example states, if you want a row ending with 4678, add `****4678` on one line.
