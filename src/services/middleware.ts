import {IMiddleware, IMiddlewareSettings, IInjectableMethod, MiddlewareType} from "../interfaces/Middleware";
import {BadRequest} from "ts-httpexceptions";
import {IInvokableScope} from "../interfaces/InvokableScope";
import {BAD_REQUEST_REQUIRED, BAD_REQUEST} from "../constants/errors-msgs";
import {getClass} from "../utils/utils";
import {INJECT_PARAMS, EXPRESS_NEXT_FN} from "../constants/metadata-keys";
import Metadata from "./metadata";
import InjectParams from "./inject-params";
import ConverterService from "./converter";
import InjectorService from "./injector";
import {Service} from "../decorators/service";
import RequestService from "./request";
import ControllerService from "./controller";
import {getClassName} from "../utils/class";

@Service()
export default class MiddlewareService {

    private static middlewares: Map<any, IMiddlewareSettings<any>> = new Map<any, IMiddlewareSettings<any>>();

    constructor(
        private injectorService: InjectorService,
        private converterService: ConverterService
    ) {

        MiddlewareService.middlewares.forEach((settings, target) => {
            settings.instance = injectorService.invoke(target);

            MiddlewareService.middlewares.set(target, settings);
        });

    }

    /**
     * Set a middleware in the registry.
     * @param target
     * @param type
     */
    static set(target: any, type: MiddlewareType) {
        this.middlewares.set(target, {type});
        return this;
    }

    /**
     * Get a middleware in the registry.
     * @param target
     * @returns {T}
     */
    static get<T extends IMiddleware>(target: any): IMiddlewareSettings<T> {
        return this.middlewares.get(target);
    }

    /**
     *
     * @param target
     * @returns {boolean}
     */
    static has(target: any): boolean {
        return this.middlewares.has(getClass(target));
    }

    /**
     *
     * @param target
     * @returns {T}
     */
    get<T extends IMiddleware>(target: any): IMiddlewareSettings<T> {
        return MiddlewareService.get<T>(getClass(target));
    }

    /**
     *
     * @param target
     * @param method
     */
    isInjectable = (target, method): boolean => (Metadata.get(INJECT_PARAMS, target, method) || []).length > 0;

    /**
     * Create a configuration to call the target middleware.
     * @param target
     * @param method
     * @returns {IInjectableMethod}
     */
    createSettings(target: any, method?: string): IInjectableMethod {

        let handler: () => Function,
            injectable: boolean = false,
            type: MiddlewareType,
            hasNextFn: boolean = false,
            length: number = 3;

        if (MiddlewareService.has(target)) {
            const middleware = this.get(target);

            type = this.get(target).type;
            injectable = this.isInjectable(target, "use");
            method = "use";

            handler = () => middleware.instance["use"].bind(middleware.instance);
            length = middleware.instance["use"].length;

        } else {

            if (target && target.prototype && target.prototype[method]) { // endpoint
                type = MiddlewareType.ENDPOINT;
                injectable = this.isInjectable(target, method);

                handler = () => {
                    const instance = this.injectorService.get<ControllerService>(ControllerService).invoke(target);
                    return instance[method].bind(instance);
                };
                length = target.prototype[method].length;

            } else {
                handler = () => target;
                type = target.length  === 4 ? MiddlewareType.ERROR : MiddlewareType.MIDDLEWARE;
                length = target.length;
            }

        }

        if (!injectable) {

            if (length === 4) {
                hasNextFn = true;
            } else if (length === 3) {
                hasNextFn = type !== MiddlewareType.ERROR;
            }
        } else {
            hasNextFn = MiddlewareService
                .getParams(target, method)
                .findIndex((p) => p.service === EXPRESS_NEXT_FN) > -1;
        }

        return {
            length,
            target,
            method,
            handler,
            type,
            injectable,
            hasNextFn
        };
    }
    /**
     *
     * @param target
     * @param method
     */
    bindMiddleware(target: any, method?: string): Function {

        // middleware(req, res, next, err);
        // middleware(req, res, next);
        // middleware(req, res);
        //
        // Enpoint.middleware(request, response);
        // Enpoint.middleware(request, response, next);
        // Enpoint.middleware(...);
        //
        // Middleware.use(request, response);
        // Middleware.use(err, request, response, next);
        // Middleware.use(request, response, next);
        // Middleware.use(...);

        const settings = this.createSettings(target, method);

        // Create Settings
        if (settings.type === MiddlewareType.ERROR) {

            return (err, request, response, next) => {
                return this.invokeMethod(settings, {err, request, response, next});
            };

        } else {
            return (request, response, next) => {
                return this.invokeMethod(settings, {request, response, next});
            };
        }

    }

    /**
     *
     * @param settings
     * @param localScope
     * @returns {any}
     */
    public invokeMethod(settings: IInjectableMethod, localScope: IInvokableScope): any {

        let {
            target, method, injectable,
            type, handler, hasNextFn
        } = settings;

        const {next} = localScope;

        return new Promise((resolve, reject) => {

            let parameters;

            localScope.next = reject;

            if (injectable) {
                parameters = this.getInjectableParameters(target, method, localScope);
            } else {
                parameters = [localScope.request, localScope.response];

                if (type === MiddlewareType.ERROR) {
                    parameters.unshift(localScope.err);
                }

                if (hasNextFn) {
                    parameters.push(localScope.next);
                }
            }

            Promise
                .resolve()
                .then(() => handler()(...parameters))
                .then((data) => {

                    if (type === MiddlewareType.ENDPOINT) {
                        localScope.request["responseData"] = data;
                    }

                    if (!hasNextFn) {
                        resolve();
                    }
                })
                .catch(reject);

        })
            .then(
                () => {
                    next();
                },
                (err) => {
                    next(err);
                }
            );

    }

    /**
     *
     * @param target
     * @param method
     * @param localScope
     */
    getInjectableParameters = (target, method, localScope?: IInvokableScope): any[] => {
        const services = MiddlewareService.getParams(target, method);
        const requestService = this.injectorService.get<RequestService>(RequestService);

        return services
            .map((param: InjectParams, index: number) => {

                if (param.name in localScope) {
                    return localScope[param.name];
                }

                let paramValue;

                /* istanbul ignore else */
                if (param.name in requestService) {
                    paramValue = requestService[param.name].call(requestService, localScope.request, param.expression);
                }

                if (param.required && (paramValue === undefined || paramValue === null)) {
                    throw new BadRequest(BAD_REQUEST_REQUIRED(param.name, param.expression));
                }

                try {

                    paramValue = this.converterService.deserialize(paramValue, param.baseType || param.use, param.use);

                } catch (err) {

                    /* istanbul ignore next */
                    if (err.name === "BAD_REQUEST") {
                        throw new BadRequest(BAD_REQUEST(param.name, param.expression) + " " + err.message);
                    } else {
                        /* istanbul ignore next */
                        (() => {
                            const castedError = new Error(err.message);
                            castedError.stack = err.stack;
                            throw castedError;
                        })();
                    }
                }

                return paramValue;

            });

    };

    /**
     *
     * @param target
     * @param method
     */
    static getParams = (target: any, method: string): InjectParams[] => Metadata.get(INJECT_PARAMS, target, method);
}