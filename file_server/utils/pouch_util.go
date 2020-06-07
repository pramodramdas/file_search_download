package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

type PouchFindQuery struct {
	Selector map[string]interface{} `json:"selector"`
	Fields   []string               `json:"fields"`
}

type PouchFindResponse struct {
	Docs []interface{} `json:"docs"`
}

func FindDocs(table string, selector map[string]interface{}, fields []string) (PouchFindResponse, error) {
	findQuery := PouchFindQuery{Selector: selector, Fields: fields}
	b := new(bytes.Buffer)
	json.NewEncoder(b).Encode(findQuery)

	client := &http.Client{}
	request, err := http.NewRequest("POST", fmt.Sprintf("%s%s/_find", os.Getenv("LOCAL_POCHDB"), table), b)
	if err != nil {
		fmt.Println(err)
		return PouchFindResponse{}, err
	}
	request.Header.Add("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		fmt.Println(err)
		return PouchFindResponse{}, err
	}
	// fmt.Println(response.Body)
	data, err := ioutil.ReadAll(response.Body)
	if err != nil {
		fmt.Println(err)
		return PouchFindResponse{}, err
	}
	var result PouchFindResponse
	err = json.Unmarshal([]byte(data), &result)
	if err != nil {
		fmt.Println(err)
		return PouchFindResponse{}, err
	}
	return result, nil
}

func GetDocById(table string, id string) (map[string]interface{}, error) {
	client := &http.Client{}
	request, err := http.NewRequest("GET", fmt.Sprintf("%s%s/%s", os.Getenv("LOCAL_POCHDB"), table, id), nil)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	response, err := client.Do(request)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	data, err := ioutil.ReadAll(response.Body)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	var result map[string]interface{}
	err = json.Unmarshal([]byte(data), &result)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	return result, nil
}

func UpdateDoc(table string, id string, body map[string]interface{}) (map[string]interface{}, error) {
	client := &http.Client{}
	doc, err := GetDocById(table, id)

	if doc == nil || err != nil {
		fmt.Println(err)
		return nil, err
	}

	if doc["error"] == "not_found" {
		doc = make(map[string]interface{})
	}

	for k, v := range body {
		doc[k] = v
	}
	b, err := json.Marshal(doc)
	request, err := http.NewRequest("PUT", fmt.Sprintf("%s%s/%s", os.Getenv("LOCAL_POCHDB"), table, id), bytes.NewBuffer(b))
	request.Header.Add("Content-Type", "application/json")

	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	response, err := client.Do(request)
	data, err := ioutil.ReadAll(response.Body)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	return result, nil
}
