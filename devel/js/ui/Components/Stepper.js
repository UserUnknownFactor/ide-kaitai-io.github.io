System.register(["vue", "../Component"], function (exports_1, context_1) {
    "use strict";
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __moduleName = context_1 && context_1.id;
    var Vue, Component_1, Stepper;
    return {
        setters: [
            function (Vue_1) {
                Vue = Vue_1;
            },
            function (Component_1_1) {
                Component_1 = Component_1_1;
            }
        ],
        execute: function () {
            Stepper = class Stepper extends Vue {
                constructor() {
                    super(...arguments);
                    this.curr = -1;
                }
                move(direction) {
                    if (this.items.length <= 0)
                        return;
                    var idx = this.curr === -1 ? (direction < 0 ? 0 : -1) : this.curr - 1;
                    idx = (this.items.length + idx + direction) % this.items.length;
                    this.curr = idx + 1;
                    this.$emit("changed", this.items[idx]);
                }
                prev() { this.move(-1); }
                next() { this.move(+1); }
            };
            Stepper = __decorate([
                Component_1.default({ props: ["items"] })
            ], Stepper);
            exports_1("Stepper", Stepper);
        }
    };
});
//# sourceMappingURL=Stepper.js.map