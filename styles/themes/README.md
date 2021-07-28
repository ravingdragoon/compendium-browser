# Color Schemes

> Contributor Note: Please update this readme accordingly if you change the underlying premise.

## Files

Every file in this themes folder represents a color scheme.
A given color scheme should be focused on only holding

* color variables to be used by the module in general
* compatibillity fixes for 3rd party modules that maybe dynamically inject content where the modules styles have effect.

## Files Structure

Every

```less
    .baseSelector {
        &.themeSelector{
            //style definitions
        }
    }
```