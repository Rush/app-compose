'use strict';
var equal = require('ajv/lib/compile/equal');
var validate = (function() {
  var refVal = [];
  var refVal1 = {
    "properties": {
      "command": {
        "type": "string"
      },
      "depends_on": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "environment": {
        "additionalProperties": {
          "type": ["string", "number", "boolean"]
        },
        "type": "object"
      },
      "export": {
        "additionalProperties": {
          "type": ["string", "number", "boolean"]
        },
        "type": "object"
      },
      "quit_signal": {
        "enum": ["SIGINT", "SIGKILL", "SIGTERM"],
        "type": "string"
      },
      "ready": {
        "properties": {
          "wait_for_log": {
            "type": "string"
          },
          "wait_for_ports": {
            "anyOf": [{
              "items": {
                "type": "string"
              },
              "type": "array"
            }, {
              "type": "boolean"
            }]
          },
          "when_done": {
            "enum": [true],
            "type": "boolean"
          }
        },
        "type": "object"
      }
    },
    "type": "object"
  };
  refVal[1] = refVal1;
  var refVal2 = {
    "properties": {
      "build": {
        "properties": {
          "context": {
            "type": "string"
          },
          "dockerfile": {
            "type": "string"
          },
          "trigger_files": {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
        },
        "type": "object"
      },
      "command": {
        "type": "string"
      },
      "cwd": {
        "type": "string"
      },
      "depends_on": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "entrypoint": {
        "type": "string"
      },
      "environment": {
        "additionalProperties": {
          "type": ["string", "number", "boolean"]
        },
        "type": "object"
      },
      "export": {
        "additionalProperties": {
          "type": ["string", "number", "boolean"]
        },
        "type": "object"
      },
      "image": {
        "type": "string"
      },
      "ports": {
        "items": {
          "type": ["string", "number"]
        },
        "type": "array"
      },
      "quit_signal": {
        "enum": ["SIGINT", "SIGKILL", "SIGTERM"],
        "type": "string"
      },
      "ready": {
        "properties": {
          "wait_for_log": {
            "type": "string"
          },
          "wait_for_ports": {
            "anyOf": [{
              "items": {
                "type": "string"
              },
              "type": "array"
            }, {
              "type": "boolean"
            }]
          },
          "when_done": {
            "enum": [true],
            "type": "boolean"
          }
        },
        "type": "object"
      },
      "volumes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "type": "object"
  };
  refVal[2] = refVal2;
  return function validate(data, dataPath, parentData, parentDataProperty, rootData) {
    'use strict';
    var vErrors = null;
    var errors = 0;
    if ((data && typeof data === "object" && !Array.isArray(data))) {
      var errs__0 = errors;
      var valid1 = true;
      var data1 = data.apps;
      if (data1 === undefined) {
        valid1 = true;
      } else {
        var errs_1 = errors;
        if ((data1 && typeof data1 === "object" && !Array.isArray(data1))) {
          var errs__1 = errors;
          var valid2 = true;
          for (var key1 in data1) {
            var data2 = data1[key1];
            var errs_2 = errors;
            var errs__2 = errors;
            var valid2 = false;
            var errs_3 = errors;
            var errs_4 = errors;
            if ((data2 && typeof data2 === "object" && !Array.isArray(data2))) {
              var errs__4 = errors;
              var valid5 = true;
              if (data2.command === undefined) {
                valid5 = true;
              } else {
                var errs_5 = errors;
                if (typeof data2.command !== "string") {
                  var err = {
                    keyword: 'type',
                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].command',
                    schemaPath: '#/definitions/ComposeAppNative/properties/command/type',
                    params: {
                      type: 'string'
                    },
                    message: 'should be string'
                  };
                  if (vErrors === null) vErrors = [err];
                  else vErrors.push(err);
                  errors++;
                }
                var valid5 = errors === errs_5;
              }
              if (valid5) {
                var data3 = data2.depends_on;
                if (data3 === undefined) {
                  valid5 = true;
                } else {
                  var errs_5 = errors;
                  if (Array.isArray(data3)) {
                    var errs__5 = errors;
                    var valid5;
                    for (var i5 = 0; i5 < data3.length; i5++) {
                      var errs_6 = errors;
                      if (typeof data3[i5] !== "string") {
                        var err = {
                          keyword: 'type',
                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].depends_on[' + i5 + ']',
                          schemaPath: '#/definitions/ComposeAppNative/properties/depends_on/items/type',
                          params: {
                            type: 'string'
                          },
                          message: 'should be string'
                        };
                        if (vErrors === null) vErrors = [err];
                        else vErrors.push(err);
                        errors++;
                      }
                      var valid6 = errors === errs_6;
                      if (!valid6) break;
                    }
                  } else {
                    var err = {
                      keyword: 'type',
                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].depends_on',
                      schemaPath: '#/definitions/ComposeAppNative/properties/depends_on/type',
                      params: {
                        type: 'array'
                      },
                      message: 'should be array'
                    };
                    if (vErrors === null) vErrors = [err];
                    else vErrors.push(err);
                    errors++;
                  }
                  var valid5 = errors === errs_5;
                }
                if (valid5) {
                  var data3 = data2.environment;
                  if (data3 === undefined) {
                    valid5 = true;
                  } else {
                    var errs_5 = errors;
                    if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                      var errs__5 = errors;
                      var valid6 = true;
                      for (var key5 in data3) {
                        var data4 = data3[key5];
                        var errs_6 = errors;
                        if (typeof data4 !== "string" && typeof data4 !== "number" && typeof data4 !== "boolean") {
                          var err = {
                            keyword: 'type',
                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].environment[\'' + key5 + '\']',
                            schemaPath: '#/definitions/ComposeAppNative/properties/environment/additionalProperties/type',
                            params: {
                              type: 'string,number,boolean'
                            },
                            message: 'should be string,number,boolean'
                          };
                          if (vErrors === null) vErrors = [err];
                          else vErrors.push(err);
                          errors++;
                        }
                        var valid6 = errors === errs_6;
                        if (!valid6) break;
                      }
                    } else {
                      var err = {
                        keyword: 'type',
                        dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].environment',
                        schemaPath: '#/definitions/ComposeAppNative/properties/environment/type',
                        params: {
                          type: 'object'
                        },
                        message: 'should be object'
                      };
                      if (vErrors === null) vErrors = [err];
                      else vErrors.push(err);
                      errors++;
                    }
                    var valid5 = errors === errs_5;
                  }
                  if (valid5) {
                    var data3 = data2.export;
                    if (data3 === undefined) {
                      valid5 = true;
                    } else {
                      var errs_5 = errors;
                      if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                        var errs__5 = errors;
                        var valid6 = true;
                        for (var key5 in data3) {
                          var data4 = data3[key5];
                          var errs_6 = errors;
                          if (typeof data4 !== "string" && typeof data4 !== "number" && typeof data4 !== "boolean") {
                            var err = {
                              keyword: 'type',
                              dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].export[\'' + key5 + '\']',
                              schemaPath: '#/definitions/ComposeAppNative/properties/export/additionalProperties/type',
                              params: {
                                type: 'string,number,boolean'
                              },
                              message: 'should be string,number,boolean'
                            };
                            if (vErrors === null) vErrors = [err];
                            else vErrors.push(err);
                            errors++;
                          }
                          var valid6 = errors === errs_6;
                          if (!valid6) break;
                        }
                      } else {
                        var err = {
                          keyword: 'type',
                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].export',
                          schemaPath: '#/definitions/ComposeAppNative/properties/export/type',
                          params: {
                            type: 'object'
                          },
                          message: 'should be object'
                        };
                        if (vErrors === null) vErrors = [err];
                        else vErrors.push(err);
                        errors++;
                      }
                      var valid5 = errors === errs_5;
                    }
                    if (valid5) {
                      var data3 = data2.quit_signal;
                      if (data3 === undefined) {
                        valid5 = true;
                      } else {
                        var errs_5 = errors;
                        if (typeof data3 !== "string") {
                          var err = {
                            keyword: 'type',
                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].quit_signal',
                            schemaPath: '#/definitions/ComposeAppNative/properties/quit_signal/type',
                            params: {
                              type: 'string'
                            },
                            message: 'should be string'
                          };
                          if (vErrors === null) vErrors = [err];
                          else vErrors.push(err);
                          errors++;
                        }
                        var schema5 = refVal1.properties.quit_signal.enum;
                        var valid5;
                        valid5 = false;
                        for (var i5 = 0; i5 < schema5.length; i5++)
                          if (equal(data3, schema5[i5])) {
                            valid5 = true;
                            break;
                          }
                        if (!valid5) {
                          var err = {
                            keyword: 'enum',
                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].quit_signal',
                            schemaPath: '#/definitions/ComposeAppNative/properties/quit_signal/enum',
                            params: {
                              allowedValues: schema5
                            },
                            message: 'should be equal to one of the allowed values'
                          };
                          if (vErrors === null) vErrors = [err];
                          else vErrors.push(err);
                          errors++;
                        }
                        var valid5 = errors === errs_5;
                      }
                      if (valid5) {
                        var data3 = data2.ready;
                        if (data3 === undefined) {
                          valid5 = true;
                        } else {
                          var errs_5 = errors;
                          if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                            var errs__5 = errors;
                            var valid6 = true;
                            if (data3.wait_for_log === undefined) {
                              valid6 = true;
                            } else {
                              var errs_6 = errors;
                              if (typeof data3.wait_for_log !== "string") {
                                var err = {
                                  keyword: 'type',
                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_log',
                                  schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/wait_for_log/type',
                                  params: {
                                    type: 'string'
                                  },
                                  message: 'should be string'
                                };
                                if (vErrors === null) vErrors = [err];
                                else vErrors.push(err);
                                errors++;
                              }
                              var valid6 = errors === errs_6;
                            }
                            if (valid6) {
                              var data4 = data3.wait_for_ports;
                              if (data4 === undefined) {
                                valid6 = true;
                              } else {
                                var errs_6 = errors;
                                var errs__6 = errors;
                                var valid6 = false;
                                var errs_7 = errors;
                                if (Array.isArray(data4)) {
                                  var errs__7 = errors;
                                  var valid7;
                                  for (var i7 = 0; i7 < data4.length; i7++) {
                                    var errs_8 = errors;
                                    if (typeof data4[i7] !== "string") {
                                      var err = {
                                        keyword: 'type',
                                        dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports[' + i7 + ']',
                                        schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/wait_for_ports/anyOf/0/items/type',
                                        params: {
                                          type: 'string'
                                        },
                                        message: 'should be string'
                                      };
                                      if (vErrors === null) vErrors = [err];
                                      else vErrors.push(err);
                                      errors++;
                                    }
                                    var valid8 = errors === errs_8;
                                    if (!valid8) break;
                                  }
                                } else {
                                  var err = {
                                    keyword: 'type',
                                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                    schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/wait_for_ports/anyOf/0/type',
                                    params: {
                                      type: 'array'
                                    },
                                    message: 'should be array'
                                  };
                                  if (vErrors === null) vErrors = [err];
                                  else vErrors.push(err);
                                  errors++;
                                }
                                var valid7 = errors === errs_7;
                                valid6 = valid6 || valid7;
                                if (!valid6) {
                                  var errs_7 = errors;
                                  if (typeof data4 !== "boolean") {
                                    var err = {
                                      keyword: 'type',
                                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                      schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/wait_for_ports/anyOf/1/type',
                                      params: {
                                        type: 'boolean'
                                      },
                                      message: 'should be boolean'
                                    };
                                    if (vErrors === null) vErrors = [err];
                                    else vErrors.push(err);
                                    errors++;
                                  }
                                  var valid7 = errors === errs_7;
                                  valid6 = valid6 || valid7;
                                }
                                if (!valid6) {
                                  var err = {
                                    keyword: 'anyOf',
                                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                    schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/wait_for_ports/anyOf',
                                    params: {},
                                    message: 'should match some schema in anyOf'
                                  };
                                  if (vErrors === null) vErrors = [err];
                                  else vErrors.push(err);
                                  errors++;
                                } else {
                                  errors = errs__6;
                                  if (vErrors !== null) {
                                    if (errs__6) vErrors.length = errs__6;
                                    else vErrors = null;
                                  }
                                }
                                var valid6 = errors === errs_6;
                              }
                              if (valid6) {
                                var data4 = data3.when_done;
                                if (data4 === undefined) {
                                  valid6 = true;
                                } else {
                                  var errs_6 = errors;
                                  if (typeof data4 !== "boolean") {
                                    var err = {
                                      keyword: 'type',
                                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.when_done',
                                      schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/when_done/type',
                                      params: {
                                        type: 'boolean'
                                      },
                                      message: 'should be boolean'
                                    };
                                    if (vErrors === null) vErrors = [err];
                                    else vErrors.push(err);
                                    errors++;
                                  }
                                  var schema6 = refVal1.properties.ready.properties.when_done.enum;
                                  var valid6;
                                  valid6 = false;
                                  for (var i6 = 0; i6 < schema6.length; i6++)
                                    if (equal(data4, schema6[i6])) {
                                      valid6 = true;
                                      break;
                                    }
                                  if (!valid6) {
                                    var err = {
                                      keyword: 'enum',
                                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.when_done',
                                      schemaPath: '#/definitions/ComposeAppNative/properties/ready/properties/when_done/enum',
                                      params: {
                                        allowedValues: schema6
                                      },
                                      message: 'should be equal to one of the allowed values'
                                    };
                                    if (vErrors === null) vErrors = [err];
                                    else vErrors.push(err);
                                    errors++;
                                  }
                                  var valid6 = errors === errs_6;
                                }
                              }
                            }
                          } else {
                            var err = {
                              keyword: 'type',
                              dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready',
                              schemaPath: '#/definitions/ComposeAppNative/properties/ready/type',
                              params: {
                                type: 'object'
                              },
                              message: 'should be object'
                            };
                            if (vErrors === null) vErrors = [err];
                            else vErrors.push(err);
                            errors++;
                          }
                          var valid5 = errors === errs_5;
                        }
                      }
                    }
                  }
                }
              }
            } else {
              var err = {
                keyword: 'type',
                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\']',
                schemaPath: '#/definitions/ComposeAppNative/type',
                params: {
                  type: 'object'
                },
                message: 'should be object'
              };
              if (vErrors === null) vErrors = [err];
              else vErrors.push(err);
              errors++;
            }
            var valid4 = errors === errs_4;
            var valid3 = errors === errs_3;
            valid2 = valid2 || valid3;
            if (!valid2) {
              var errs_3 = errors;
              var errs_4 = errors;
              if ((data2 && typeof data2 === "object" && !Array.isArray(data2))) {
                var errs__4 = errors;
                var valid5 = true;
                var data3 = data2.build;
                if (data3 === undefined) {
                  valid5 = true;
                } else {
                  var errs_5 = errors;
                  if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                    var errs__5 = errors;
                    var valid6 = true;
                    if (data3.context === undefined) {
                      valid6 = true;
                    } else {
                      var errs_6 = errors;
                      if (typeof data3.context !== "string") {
                        var err = {
                          keyword: 'type',
                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].build.context',
                          schemaPath: '#/definitions/ComposeAppDocker/properties/build/properties/context/type',
                          params: {
                            type: 'string'
                          },
                          message: 'should be string'
                        };
                        if (vErrors === null) vErrors = [err];
                        else vErrors.push(err);
                        errors++;
                      }
                      var valid6 = errors === errs_6;
                    }
                    if (valid6) {
                      if (data3.dockerfile === undefined) {
                        valid6 = true;
                      } else {
                        var errs_6 = errors;
                        if (typeof data3.dockerfile !== "string") {
                          var err = {
                            keyword: 'type',
                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].build.dockerfile',
                            schemaPath: '#/definitions/ComposeAppDocker/properties/build/properties/dockerfile/type',
                            params: {
                              type: 'string'
                            },
                            message: 'should be string'
                          };
                          if (vErrors === null) vErrors = [err];
                          else vErrors.push(err);
                          errors++;
                        }
                        var valid6 = errors === errs_6;
                      }
                      if (valid6) {
                        var data4 = data3.trigger_files;
                        if (data4 === undefined) {
                          valid6 = true;
                        } else {
                          var errs_6 = errors;
                          if (Array.isArray(data4)) {
                            var errs__6 = errors;
                            var valid6;
                            for (var i6 = 0; i6 < data4.length; i6++) {
                              var errs_7 = errors;
                              if (typeof data4[i6] !== "string") {
                                var err = {
                                  keyword: 'type',
                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].build.trigger_files[' + i6 + ']',
                                  schemaPath: '#/definitions/ComposeAppDocker/properties/build/properties/trigger_files/items/type',
                                  params: {
                                    type: 'string'
                                  },
                                  message: 'should be string'
                                };
                                if (vErrors === null) vErrors = [err];
                                else vErrors.push(err);
                                errors++;
                              }
                              var valid7 = errors === errs_7;
                              if (!valid7) break;
                            }
                          } else {
                            var err = {
                              keyword: 'type',
                              dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].build.trigger_files',
                              schemaPath: '#/definitions/ComposeAppDocker/properties/build/properties/trigger_files/type',
                              params: {
                                type: 'array'
                              },
                              message: 'should be array'
                            };
                            if (vErrors === null) vErrors = [err];
                            else vErrors.push(err);
                            errors++;
                          }
                          var valid6 = errors === errs_6;
                        }
                      }
                    }
                  } else {
                    var err = {
                      keyword: 'type',
                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].build',
                      schemaPath: '#/definitions/ComposeAppDocker/properties/build/type',
                      params: {
                        type: 'object'
                      },
                      message: 'should be object'
                    };
                    if (vErrors === null) vErrors = [err];
                    else vErrors.push(err);
                    errors++;
                  }
                  var valid5 = errors === errs_5;
                }
                if (valid5) {
                  if (data2.command === undefined) {
                    valid5 = true;
                  } else {
                    var errs_5 = errors;
                    if (typeof data2.command !== "string") {
                      var err = {
                        keyword: 'type',
                        dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].command',
                        schemaPath: '#/definitions/ComposeAppDocker/properties/command/type',
                        params: {
                          type: 'string'
                        },
                        message: 'should be string'
                      };
                      if (vErrors === null) vErrors = [err];
                      else vErrors.push(err);
                      errors++;
                    }
                    var valid5 = errors === errs_5;
                  }
                  if (valid5) {
                    if (data2.cwd === undefined) {
                      valid5 = true;
                    } else {
                      var errs_5 = errors;
                      if (typeof data2.cwd !== "string") {
                        var err = {
                          keyword: 'type',
                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].cwd',
                          schemaPath: '#/definitions/ComposeAppDocker/properties/cwd/type',
                          params: {
                            type: 'string'
                          },
                          message: 'should be string'
                        };
                        if (vErrors === null) vErrors = [err];
                        else vErrors.push(err);
                        errors++;
                      }
                      var valid5 = errors === errs_5;
                    }
                    if (valid5) {
                      var data3 = data2.depends_on;
                      if (data3 === undefined) {
                        valid5 = true;
                      } else {
                        var errs_5 = errors;
                        if (Array.isArray(data3)) {
                          var errs__5 = errors;
                          var valid5;
                          for (var i5 = 0; i5 < data3.length; i5++) {
                            var errs_6 = errors;
                            if (typeof data3[i5] !== "string") {
                              var err = {
                                keyword: 'type',
                                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].depends_on[' + i5 + ']',
                                schemaPath: '#/definitions/ComposeAppDocker/properties/depends_on/items/type',
                                params: {
                                  type: 'string'
                                },
                                message: 'should be string'
                              };
                              if (vErrors === null) vErrors = [err];
                              else vErrors.push(err);
                              errors++;
                            }
                            var valid6 = errors === errs_6;
                            if (!valid6) break;
                          }
                        } else {
                          var err = {
                            keyword: 'type',
                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].depends_on',
                            schemaPath: '#/definitions/ComposeAppDocker/properties/depends_on/type',
                            params: {
                              type: 'array'
                            },
                            message: 'should be array'
                          };
                          if (vErrors === null) vErrors = [err];
                          else vErrors.push(err);
                          errors++;
                        }
                        var valid5 = errors === errs_5;
                      }
                      if (valid5) {
                        if (data2.entrypoint === undefined) {
                          valid5 = true;
                        } else {
                          var errs_5 = errors;
                          if (typeof data2.entrypoint !== "string") {
                            var err = {
                              keyword: 'type',
                              dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].entrypoint',
                              schemaPath: '#/definitions/ComposeAppDocker/properties/entrypoint/type',
                              params: {
                                type: 'string'
                              },
                              message: 'should be string'
                            };
                            if (vErrors === null) vErrors = [err];
                            else vErrors.push(err);
                            errors++;
                          }
                          var valid5 = errors === errs_5;
                        }
                        if (valid5) {
                          var data3 = data2.environment;
                          if (data3 === undefined) {
                            valid5 = true;
                          } else {
                            var errs_5 = errors;
                            if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                              var errs__5 = errors;
                              var valid6 = true;
                              for (var key5 in data3) {
                                var data4 = data3[key5];
                                var errs_6 = errors;
                                if (typeof data4 !== "string" && typeof data4 !== "number" && typeof data4 !== "boolean") {
                                  var err = {
                                    keyword: 'type',
                                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].environment[\'' + key5 + '\']',
                                    schemaPath: '#/definitions/ComposeAppDocker/properties/environment/additionalProperties/type',
                                    params: {
                                      type: 'string,number,boolean'
                                    },
                                    message: 'should be string,number,boolean'
                                  };
                                  if (vErrors === null) vErrors = [err];
                                  else vErrors.push(err);
                                  errors++;
                                }
                                var valid6 = errors === errs_6;
                                if (!valid6) break;
                              }
                            } else {
                              var err = {
                                keyword: 'type',
                                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].environment',
                                schemaPath: '#/definitions/ComposeAppDocker/properties/environment/type',
                                params: {
                                  type: 'object'
                                },
                                message: 'should be object'
                              };
                              if (vErrors === null) vErrors = [err];
                              else vErrors.push(err);
                              errors++;
                            }
                            var valid5 = errors === errs_5;
                          }
                          if (valid5) {
                            var data3 = data2.export;
                            if (data3 === undefined) {
                              valid5 = true;
                            } else {
                              var errs_5 = errors;
                              if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                                var errs__5 = errors;
                                var valid6 = true;
                                for (var key5 in data3) {
                                  var data4 = data3[key5];
                                  var errs_6 = errors;
                                  if (typeof data4 !== "string" && typeof data4 !== "number" && typeof data4 !== "boolean") {
                                    var err = {
                                      keyword: 'type',
                                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].export[\'' + key5 + '\']',
                                      schemaPath: '#/definitions/ComposeAppDocker/properties/export/additionalProperties/type',
                                      params: {
                                        type: 'string,number,boolean'
                                      },
                                      message: 'should be string,number,boolean'
                                    };
                                    if (vErrors === null) vErrors = [err];
                                    else vErrors.push(err);
                                    errors++;
                                  }
                                  var valid6 = errors === errs_6;
                                  if (!valid6) break;
                                }
                              } else {
                                var err = {
                                  keyword: 'type',
                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].export',
                                  schemaPath: '#/definitions/ComposeAppDocker/properties/export/type',
                                  params: {
                                    type: 'object'
                                  },
                                  message: 'should be object'
                                };
                                if (vErrors === null) vErrors = [err];
                                else vErrors.push(err);
                                errors++;
                              }
                              var valid5 = errors === errs_5;
                            }
                            if (valid5) {
                              if (data2.image === undefined) {
                                valid5 = true;
                              } else {
                                var errs_5 = errors;
                                if (typeof data2.image !== "string") {
                                  var err = {
                                    keyword: 'type',
                                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].image',
                                    schemaPath: '#/definitions/ComposeAppDocker/properties/image/type',
                                    params: {
                                      type: 'string'
                                    },
                                    message: 'should be string'
                                  };
                                  if (vErrors === null) vErrors = [err];
                                  else vErrors.push(err);
                                  errors++;
                                }
                                var valid5 = errors === errs_5;
                              }
                              if (valid5) {
                                var data3 = data2.ports;
                                if (data3 === undefined) {
                                  valid5 = true;
                                } else {
                                  var errs_5 = errors;
                                  if (Array.isArray(data3)) {
                                    var errs__5 = errors;
                                    var valid5;
                                    for (var i5 = 0; i5 < data3.length; i5++) {
                                      var data4 = data3[i5];
                                      var errs_6 = errors;
                                      if (typeof data4 !== "string" && typeof data4 !== "number") {
                                        var err = {
                                          keyword: 'type',
                                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ports[' + i5 + ']',
                                          schemaPath: '#/definitions/ComposeAppDocker/properties/ports/items/type',
                                          params: {
                                            type: 'string,number'
                                          },
                                          message: 'should be string,number'
                                        };
                                        if (vErrors === null) vErrors = [err];
                                        else vErrors.push(err);
                                        errors++;
                                      }
                                      var valid6 = errors === errs_6;
                                      if (!valid6) break;
                                    }
                                  } else {
                                    var err = {
                                      keyword: 'type',
                                      dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ports',
                                      schemaPath: '#/definitions/ComposeAppDocker/properties/ports/type',
                                      params: {
                                        type: 'array'
                                      },
                                      message: 'should be array'
                                    };
                                    if (vErrors === null) vErrors = [err];
                                    else vErrors.push(err);
                                    errors++;
                                  }
                                  var valid5 = errors === errs_5;
                                }
                                if (valid5) {
                                  var data3 = data2.quit_signal;
                                  if (data3 === undefined) {
                                    valid5 = true;
                                  } else {
                                    var errs_5 = errors;
                                    if (typeof data3 !== "string") {
                                      var err = {
                                        keyword: 'type',
                                        dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].quit_signal',
                                        schemaPath: '#/definitions/ComposeAppDocker/properties/quit_signal/type',
                                        params: {
                                          type: 'string'
                                        },
                                        message: 'should be string'
                                      };
                                      if (vErrors === null) vErrors = [err];
                                      else vErrors.push(err);
                                      errors++;
                                    }
                                    var schema5 = refVal2.properties.quit_signal.enum;
                                    var valid5;
                                    valid5 = false;
                                    for (var i5 = 0; i5 < schema5.length; i5++)
                                      if (equal(data3, schema5[i5])) {
                                        valid5 = true;
                                        break;
                                      }
                                    if (!valid5) {
                                      var err = {
                                        keyword: 'enum',
                                        dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].quit_signal',
                                        schemaPath: '#/definitions/ComposeAppDocker/properties/quit_signal/enum',
                                        params: {
                                          allowedValues: schema5
                                        },
                                        message: 'should be equal to one of the allowed values'
                                      };
                                      if (vErrors === null) vErrors = [err];
                                      else vErrors.push(err);
                                      errors++;
                                    }
                                    var valid5 = errors === errs_5;
                                  }
                                  if (valid5) {
                                    var data3 = data2.ready;
                                    if (data3 === undefined) {
                                      valid5 = true;
                                    } else {
                                      var errs_5 = errors;
                                      if ((data3 && typeof data3 === "object" && !Array.isArray(data3))) {
                                        var errs__5 = errors;
                                        var valid6 = true;
                                        if (data3.wait_for_log === undefined) {
                                          valid6 = true;
                                        } else {
                                          var errs_6 = errors;
                                          if (typeof data3.wait_for_log !== "string") {
                                            var err = {
                                              keyword: 'type',
                                              dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_log',
                                              schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/wait_for_log/type',
                                              params: {
                                                type: 'string'
                                              },
                                              message: 'should be string'
                                            };
                                            if (vErrors === null) vErrors = [err];
                                            else vErrors.push(err);
                                            errors++;
                                          }
                                          var valid6 = errors === errs_6;
                                        }
                                        if (valid6) {
                                          var data4 = data3.wait_for_ports;
                                          if (data4 === undefined) {
                                            valid6 = true;
                                          } else {
                                            var errs_6 = errors;
                                            var errs__6 = errors;
                                            var valid6 = false;
                                            var errs_7 = errors;
                                            if (Array.isArray(data4)) {
                                              var errs__7 = errors;
                                              var valid7;
                                              for (var i7 = 0; i7 < data4.length; i7++) {
                                                var errs_8 = errors;
                                                if (typeof data4[i7] !== "string") {
                                                  var err = {
                                                    keyword: 'type',
                                                    dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports[' + i7 + ']',
                                                    schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/wait_for_ports/anyOf/0/items/type',
                                                    params: {
                                                      type: 'string'
                                                    },
                                                    message: 'should be string'
                                                  };
                                                  if (vErrors === null) vErrors = [err];
                                                  else vErrors.push(err);
                                                  errors++;
                                                }
                                                var valid8 = errors === errs_8;
                                                if (!valid8) break;
                                              }
                                            } else {
                                              var err = {
                                                keyword: 'type',
                                                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                                schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/wait_for_ports/anyOf/0/type',
                                                params: {
                                                  type: 'array'
                                                },
                                                message: 'should be array'
                                              };
                                              if (vErrors === null) vErrors = [err];
                                              else vErrors.push(err);
                                              errors++;
                                            }
                                            var valid7 = errors === errs_7;
                                            valid6 = valid6 || valid7;
                                            if (!valid6) {
                                              var errs_7 = errors;
                                              if (typeof data4 !== "boolean") {
                                                var err = {
                                                  keyword: 'type',
                                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                                  schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/wait_for_ports/anyOf/1/type',
                                                  params: {
                                                    type: 'boolean'
                                                  },
                                                  message: 'should be boolean'
                                                };
                                                if (vErrors === null) vErrors = [err];
                                                else vErrors.push(err);
                                                errors++;
                                              }
                                              var valid7 = errors === errs_7;
                                              valid6 = valid6 || valid7;
                                            }
                                            if (!valid6) {
                                              var err = {
                                                keyword: 'anyOf',
                                                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.wait_for_ports',
                                                schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/wait_for_ports/anyOf',
                                                params: {},
                                                message: 'should match some schema in anyOf'
                                              };
                                              if (vErrors === null) vErrors = [err];
                                              else vErrors.push(err);
                                              errors++;
                                            } else {
                                              errors = errs__6;
                                              if (vErrors !== null) {
                                                if (errs__6) vErrors.length = errs__6;
                                                else vErrors = null;
                                              }
                                            }
                                            var valid6 = errors === errs_6;
                                          }
                                          if (valid6) {
                                            var data4 = data3.when_done;
                                            if (data4 === undefined) {
                                              valid6 = true;
                                            } else {
                                              var errs_6 = errors;
                                              if (typeof data4 !== "boolean") {
                                                var err = {
                                                  keyword: 'type',
                                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.when_done',
                                                  schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/when_done/type',
                                                  params: {
                                                    type: 'boolean'
                                                  },
                                                  message: 'should be boolean'
                                                };
                                                if (vErrors === null) vErrors = [err];
                                                else vErrors.push(err);
                                                errors++;
                                              }
                                              var schema6 = refVal2.properties.ready.properties.when_done.enum;
                                              var valid6;
                                              valid6 = false;
                                              for (var i6 = 0; i6 < schema6.length; i6++)
                                                if (equal(data4, schema6[i6])) {
                                                  valid6 = true;
                                                  break;
                                                }
                                              if (!valid6) {
                                                var err = {
                                                  keyword: 'enum',
                                                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready.when_done',
                                                  schemaPath: '#/definitions/ComposeAppDocker/properties/ready/properties/when_done/enum',
                                                  params: {
                                                    allowedValues: schema6
                                                  },
                                                  message: 'should be equal to one of the allowed values'
                                                };
                                                if (vErrors === null) vErrors = [err];
                                                else vErrors.push(err);
                                                errors++;
                                              }
                                              var valid6 = errors === errs_6;
                                            }
                                          }
                                        }
                                      } else {
                                        var err = {
                                          keyword: 'type',
                                          dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].ready',
                                          schemaPath: '#/definitions/ComposeAppDocker/properties/ready/type',
                                          params: {
                                            type: 'object'
                                          },
                                          message: 'should be object'
                                        };
                                        if (vErrors === null) vErrors = [err];
                                        else vErrors.push(err);
                                        errors++;
                                      }
                                      var valid5 = errors === errs_5;
                                    }
                                    if (valid5) {
                                      var data3 = data2.volumes;
                                      if (data3 === undefined) {
                                        valid5 = true;
                                      } else {
                                        var errs_5 = errors;
                                        if (Array.isArray(data3)) {
                                          var errs__5 = errors;
                                          var valid5;
                                          for (var i5 = 0; i5 < data3.length; i5++) {
                                            var errs_6 = errors;
                                            if (typeof data3[i5] !== "string") {
                                              var err = {
                                                keyword: 'type',
                                                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].volumes[' + i5 + ']',
                                                schemaPath: '#/definitions/ComposeAppDocker/properties/volumes/items/type',
                                                params: {
                                                  type: 'string'
                                                },
                                                message: 'should be string'
                                              };
                                              if (vErrors === null) vErrors = [err];
                                              else vErrors.push(err);
                                              errors++;
                                            }
                                            var valid6 = errors === errs_6;
                                            if (!valid6) break;
                                          }
                                        } else {
                                          var err = {
                                            keyword: 'type',
                                            dataPath: (dataPath || '') + '.apps[\'' + key1 + '\'].volumes',
                                            schemaPath: '#/definitions/ComposeAppDocker/properties/volumes/type',
                                            params: {
                                              type: 'array'
                                            },
                                            message: 'should be array'
                                          };
                                          if (vErrors === null) vErrors = [err];
                                          else vErrors.push(err);
                                          errors++;
                                        }
                                        var valid5 = errors === errs_5;
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                var err = {
                  keyword: 'type',
                  dataPath: (dataPath || '') + '.apps[\'' + key1 + '\']',
                  schemaPath: '#/definitions/ComposeAppDocker/type',
                  params: {
                    type: 'object'
                  },
                  message: 'should be object'
                };
                if (vErrors === null) vErrors = [err];
                else vErrors.push(err);
                errors++;
              }
              var valid4 = errors === errs_4;
              var valid3 = errors === errs_3;
              valid2 = valid2 || valid3;
            }
            if (!valid2) {
              var err = {
                keyword: 'anyOf',
                dataPath: (dataPath || '') + '.apps[\'' + key1 + '\']',
                schemaPath: '#/properties/apps/additionalProperties/anyOf',
                params: {},
                message: 'should match some schema in anyOf'
              };
              if (vErrors === null) vErrors = [err];
              else vErrors.push(err);
              errors++;
              validate.errors = vErrors;
              return false;
            } else {
              errors = errs__2;
              if (vErrors !== null) {
                if (errs__2) vErrors.length = errs__2;
                else vErrors = null;
              }
            }
            var valid2 = errors === errs_2;
            if (!valid2) break;
          }
        } else {
          validate.errors = [{
            keyword: 'type',
            dataPath: (dataPath || '') + '.apps',
            schemaPath: '#/properties/apps/type',
            params: {
              type: 'object'
            },
            message: 'should be object'
          }];
          return false;
        }
        var valid1 = errors === errs_1;
      }
      if (valid1) {
        var data1 = data.environment;
        if (data1 === undefined) {
          valid1 = true;
        } else {
          var errs_1 = errors;
          if ((data1 && typeof data1 === "object" && !Array.isArray(data1))) {
            var errs__1 = errors;
            var valid2 = true;
            for (var key1 in data1) {
              var data2 = data1[key1];
              var errs_2 = errors;
              if (typeof data2 !== "string" && typeof data2 !== "number" && typeof data2 !== "boolean") {
                validate.errors = [{
                  keyword: 'type',
                  dataPath: (dataPath || '') + '.environment[\'' + key1 + '\']',
                  schemaPath: '#/properties/environment/additionalProperties/type',
                  params: {
                    type: 'string,number,boolean'
                  },
                  message: 'should be string,number,boolean'
                }];
                return false;
              }
              var valid2 = errors === errs_2;
              if (!valid2) break;
            }
          } else {
            validate.errors = [{
              keyword: 'type',
              dataPath: (dataPath || '') + '.environment',
              schemaPath: '#/properties/environment/type',
              params: {
                type: 'object'
              },
              message: 'should be object'
            }];
            return false;
          }
          var valid1 = errors === errs_1;
        }
      }
    } else {
      validate.errors = [{
        keyword: 'type',
        dataPath: (dataPath || '') + "",
        schemaPath: '#/type',
        params: {
          type: 'object'
        },
        message: 'should be object'
      }];
      return false;
    }
    validate.errors = vErrors;
    return errors === 0;
  };
})();
validate.schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "ComposeAppDocker": {
      "properties": {
        "build": {
          "properties": {
            "context": {
              "type": "string"
            },
            "dockerfile": {
              "type": "string"
            },
            "trigger_files": {
              "items": {
                "type": "string"
              },
              "type": "array"
            }
          },
          "type": "object"
        },
        "command": {
          "type": "string"
        },
        "cwd": {
          "type": "string"
        },
        "depends_on": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "entrypoint": {
          "type": "string"
        },
        "environment": {
          "additionalProperties": {
            "type": ["string", "number", "boolean"]
          },
          "type": "object"
        },
        "export": {
          "additionalProperties": {
            "type": ["string", "number", "boolean"]
          },
          "type": "object"
        },
        "image": {
          "type": "string"
        },
        "ports": {
          "items": {
            "type": ["string", "number"]
          },
          "type": "array"
        },
        "quit_signal": {
          "enum": ["SIGINT", "SIGKILL", "SIGTERM"],
          "type": "string"
        },
        "ready": {
          "properties": {
            "wait_for_log": {
              "type": "string"
            },
            "wait_for_ports": {
              "anyOf": [{
                "items": {
                  "type": "string"
                },
                "type": "array"
              }, {
                "type": "boolean"
              }]
            },
            "when_done": {
              "enum": [true],
              "type": "boolean"
            }
          },
          "type": "object"
        },
        "volumes": {
          "items": {
            "type": "string"
          },
          "type": "array"
        }
      },
      "type": "object"
    },
    "ComposeAppNative": {
      "properties": {
        "command": {
          "type": "string"
        },
        "depends_on": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "environment": {
          "additionalProperties": {
            "type": ["string", "number", "boolean"]
          },
          "type": "object"
        },
        "export": {
          "additionalProperties": {
            "type": ["string", "number", "boolean"]
          },
          "type": "object"
        },
        "quit_signal": {
          "enum": ["SIGINT", "SIGKILL", "SIGTERM"],
          "type": "string"
        },
        "ready": {
          "properties": {
            "wait_for_log": {
              "type": "string"
            },
            "wait_for_ports": {
              "anyOf": [{
                "items": {
                  "type": "string"
                },
                "type": "array"
              }, {
                "type": "boolean"
              }]
            },
            "when_done": {
              "enum": [true],
              "type": "boolean"
            }
          },
          "type": "object"
        }
      },
      "type": "object"
    }
  },
  "properties": {
    "apps": {
      "additionalProperties": {
        "anyOf": [{
          "$ref": "#/definitions/ComposeAppNative"
        }, {
          "$ref": "#/definitions/ComposeAppDocker"
        }]
      },
      "type": "object"
    },
    "environment": {
      "additionalProperties": {
        "type": ["string", "number", "boolean"]
      },
      "type": "object"
    }
  },
  "type": "object"
};
validate.errors = null;
module.exports = validate;