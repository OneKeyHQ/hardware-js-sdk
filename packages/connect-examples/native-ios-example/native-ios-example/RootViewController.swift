//
//  ViewController.swift
//  native-ios-example
//
//  Created by Leon on 2023/8/11.
//

import UIKit
import WebKit

class RootViewController: UIViewController {
    var webView: WKWebView!
    var button: UIButton!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor=UIColor.blue
        // Do any additional setup after loading the view.

        // 创建 WebView
        webView = WKWebView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        // 设置 WebView 的约束
        webView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -300).isActive = true
        webView.leadingAnchor.constraint(equalTo: view.leadingAnchor).isActive = true
        webView.trailingAnchor.constraint(equalTo: view.trailingAnchor).isActive = true
        webView.heightAnchor.constraint(equalToConstant: 300).isActive = true

        // 创建 UIButton
        button = UIButton()
        button.backgroundColor=UIColor.red
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Search Device", for: .normal)
        button.addTarget(self, action: #selector(buttonClicked), for: .touchUpInside)
        view.addSubview(button)

        // 设置 UIButton 的约束
        button.topAnchor.constraint(equalTo: view.topAnchor, constant: 100).isActive = true
        button.centerXAnchor.constraint(equalTo: view.centerXAnchor).isActive = true
    }

    @objc func buttonClicked() {
        // 在这里实现按钮点击的功能
        // 点击按钮后的操作代码
        print("Button clicked!")
    }

}

