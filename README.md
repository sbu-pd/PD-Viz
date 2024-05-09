# PD-Viz

## :warning: Prerequisites

* Must have `git` installed.

* Must have repository cloned.

```
$ sudo apt-get install git
```


## :arrow_down: Installing and Using

Clone the repository into a new directory:

```
$ git clone https://github.com/jannelson36/Data-Vibe.git
```
Begin by creating a virtual Python environment:

```
pip install virtualenv
```

Navigate to the project root folder and create the virtual environment:

```
virtualenv flask
```

The virtual environment must be activated before you can install packages. In the project root folder, execute:

```
source flask/bin/activate
```

Install Dependencies
```
pip install -r requirements.txt
```

Run Visualization
```
python app.py
```