import { CompendiumBrowser } from '../scripts/compendium-browser.js';

export class moduleHooks {

    static onInit() {
        Hooks.on('init', async () => {
            Handlebars.registerHelper('switch', function (value, options) {
                this.switch_value = value;
                this.switch_break = false;
                return options.fn(this);
            });

            Handlebars.registerHelper('case', function (value, options) {
                if (value == this.switch_value) {
                    this.switch_break = true;
                    return options.fn(this);
                }
            });

            Handlebars.registerHelper('default', function (value, options) {
                if (this.switch_break == false) {
                    return value;
                }
            });

            Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
                switch (operator) {
                    case '==':
                        return (v1 == v2) ? options.fn(this) : options.inverse(this);
                    case '===':
                        return (v1 === v2) ? options.fn(this) : options.inverse(this);
                    case '!=':
                        return (v1 != v2) ? options.fn(this) : options.inverse(this);
                    case '!==':
                        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                    case '<':
                        return (v1 < v2) ? options.fn(this) : options.inverse(this);
                    case '<=':
                        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                    case '>':
                        return (v1 > v2) ? options.fn(this) : options.inverse(this);
                    case '>=':
                        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                    case '&&':
                        return (v1 && v2) ? options.fn(this) : options.inverse(this);
                    case '||':
                        return (v1 || v2) ? options.fn(this) : options.inverse(this);
                    default:
                        return options.inverse(this);
                }
            });
        });
    }

    static onReady() {
        Hooks.on('ready', async () => {
            if (game.compendiumBrowser === undefined) {
                game.compendiumBrowser = new CompendiumBrowser();
                //0.4.0 Defer loading content until we actually use the Compendium Browser
                //A compromise approach would be better (periodic loading) except would still create the memory use problem
                await game.compendiumBrowser.initialize();
            }
        });
    }

    static onRenderComplete() {
        Hooks.on("renderCompendiumBrowser", CompendiumBrowser.afterRender);
    }

}