#!/bin/bash
sudo yum update -y
sudo timedatectl set-timezone Asia/Tokyo
sudo localectl set-locale LANG=ja_JP.utf8
sudo source /etc/locale.conf
