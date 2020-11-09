
class Dep{
    constructor() {
        this.events = [];
    }
    addWatchers(watcher) {
        this.events.push(watcher)
    }
    targetWatchers() {
        this.events.forEach(item => {
            // 执行每一个watcher实例的回调函数
            item.targetCbk()
        })
    }
};

Dep.target = null;

let dep = new Dep()


/**
 * 1.在该类中实现各级属性的田间劫持功能
 *
 * @class Observe
 */
class Observe{
    // 鉴于咱们所用到的数据结构可能会嵌套层级较深，并且数据的每一级属性都应变成可观察属性，所以将$data就行操作
    constructor(data) {
        // 只有是引用类型的对象才可添加属性劫持，基本类型的值不需要
        if (typeof data !== 'object') {
            return
        }
        this.$data = data;
        this.init();
    }
    init() {
        Object.keys(this.$data).forEach(item => {
            this.observer(this.$data, item, this.$data[item])
        })
    }
    observer(target, key, value) {
        // 通过递归的形式满足每一级属性的劫持添加
        new Observe(value);
        Object.defineProperty(target, key, {
            // 第九步
            get() {
                // 根据刚刚赋予的watcher实例，条件成立
                if (Dep.target) {
                    // 然后把watcher实例添加入一个数组队列中
                    dep.addWatchers(Dep.target)
                }
                return value
            },
            // 第十二步
            set(newVal) {
                if (value !== newVal) {
                    value = newVal;
                    // 防止在某个属性默认值是基本类型，而在被修改时变成引用类型的时候 --> name: 'renyl' ===> name: {age: 18}
                    new Observe(value)
                    // 通过捕捉该属性值的变化来去触发所有的收集到的watcher实例方法
                    dep.targetWatchers()
                }
            }
        })
    }
}


/*
* 1.设置公用的赋值内容的方法
*/
const Utils = {
    setVal(data, key, node, val) {
        node[val] = this.getVa(data, key)
    },
    // 该方法去处理key的两种模式（是否以对象的形式在访问值--> ' . '）
    getVa(data, key) {
        if (key.indexOf('.') > -1) {
            let keys = key.split('.');
            // 通过不断改变data的值（当前key的值），进行深层次的介入
            keys.forEach(item => {
                data = data[item]
            })
            return data
        } else {
            return data[key]
        }
    },
    // 第十一步
    changeValue(data, key, newVal) {
        if (key.indexOf('.') > -1) {
            let keys = key.split('.');
            // 根据keys的长度减一获取到该属性存在的数据集合
            for(let i = 0; i < keys.length - 1; i++) {
                data = data[keys[i]]
            }
            // 在修改该属性值的时候实则是触发了该属性的set方法 （接下来会触发第十二步）
            data[keys[keys.length - 1]] = newVal
        } else {
            data[key] = newVal
        }
    }
}

// data = {
//     defaultVal: '默认值',
//     obj: {
//         name: 'renyl'
//     }
// }

// keys = ['obj', 'name']



class Watcher{
    constructor(data, key, cbk) {
        // 把每一次的watcher实例赋予第三者，方便存储
        Dep.target = this;
        this.data = data;
        this.key = key;
        this.cbk = cbk;
        // 在此获取该属性的值，为了调用属性的get方法
        this.init()
    }
    init() {
        // 获取属性值的过程会调用该属性get方法，接下来会发生第九步
        let res = Utils.getVa(this.data, this.key);
        // 重新把target置空，为下一次实例watcher做准备
        Dep.target = null;
        return res;
    }
    // 第十三步
    targetCbk() {
         // 此处获取的是该属性修改之后的新值
        let res = this.init()
        this.cbk(res)
    }
}


/**
 * 1.在实例的初始化的时候，需要把data内的属性全部挂载到Vue的实例上方便调用
 * 2.在往this身上挂载的时候还需要去添加数据劫持
 * 3.给每一级的属性均添加劫持
 * 4.获取所有的涉及到的dom元素，变更其内容
 * 
 * @class Vue
 */
class Vue{
    // 第一步执行
    constructor({el, data}) {
        // 根据参数获取到整个涉及数据绑定的结构根节点，这样可以根据这个根节点来找寻对应的数据子节点
        this.$el = document.getElementById(el);
        // 将传入的数据绑定到实例上
        this.$data = data;
        // 第二步
        this.init();
        // 第四步
        this.initDom()
    }
    initDom() {
        console.log(this.$el)
        // 创建文档碎片流，引申以原生方式来去避免浏览器繁多的重绘重排的操作，如：在文档碎片流中去操作Dom实则不会触发浏览器的相关操作
        let fragment = document.createDocumentFragment();
        console.log(fragment)
        let firstChild;
        // 通过循环不断往碎片流中去添加每一个子元素，切记如本身的某个节点被添加到其他处时，在本身中就不复存在
        while(firstChild = this.$el.firstChild) {
            fragment.appendChild(firstChild)
        }
        // 第五步
        this.compiler(fragment)
        // 将最终操作完成的碎片流整体加入根节点中，使得浏览器进行一次统一的重排重绘
        this.$el.appendChild(fragment)
    }
    // 定义一个模板解析方法使得可以有效的拿到每一个节点进行操作
    compiler(node) {
        // 筛选对应的元素节点
        if (node.nodeType === 1) {
            // 根据节点身上属性是否携带v-model来判断节点是否属于input元素
            let isInp = [...node.attributes].filter(item => item.nodeName === 'v-model')[0];
            if (isInp) {
                let atrVal = isInp.nodeValue;
                // 第六步
                Utils.setVal(this.$data, atrVal, node, 'value');
                // 第七步
                node.addEventListener('input', e => {
                    // 第十步   用户涉及页面操作的时候所触发的代码
                    // 绑定input事件来获取用户的操作内容
                    let newVal = e.target.value;
                    // 根据用户输入的内容去修改对应的属性
                    Utils.changeValue(this.$data, atrVal, newVal)
                })
            }
        } else if (node.nodeType === 3) {
            let contentValue;
            // 通过截取的方式获取到对应的属性key名
            node.textContent.indexOf('{{') > -1 && (contentValue = node.textContent.split('{{')[1].split('}}')[0])
            // function changeContent(newVal) {
            //     node.textContent = newVal
            // }
            // 第八步  通过一个类来给每一个用到属性的元素节点添加一个更新视图的方法（切记凡是满足文本节点的均会挂载这个实例）
            contentValue && new Watcher(this.$data, contentValue, (newVal) => {
                // 最后一步 更新视图
                node.textContent = newVal
            })
            contentValue && Utils.setVal(this.$data, contentValue, node, 'textContent')
        }
        if (node.childNodes && node.childNodes.length > 0) {
            node.childNodes.forEach(item => {
                this.compiler(item)
            })
        }
    }
    init() {
        //  基于vue组件的实例过程，来实现在实例生成之时，将data里面的所有属性均挂载到this实例上，并且在挂载的过程是以Object.defineProperty的方式来实现
        Object.keys(this.$data).forEach(item => {
            this.observer(this, item, this.$data[item])
        })
        // 第三步
        new Observe(this.$data)
    }
    observer(target, key, value) {
        Object.defineProperty(target, key, {
            get() {
                return value
            },
            set(newVal) {
                value = newVal
            }
        })
    }
}